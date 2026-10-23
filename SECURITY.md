# SECURITY.md: Security Policies & Threat Mitigations

> **Status**: Mandatory Security Baseline & Verification Standard  
> **Source of Truth**: [SPEC.md](file:///c:/Users/abhay%20mishra/Downloads/3D_website/SPEC.md) (Section 9)  
> **Operational Compliance**: Required across all PRs and agent tasks.

---

## 1. Authentication & Role-Based Authorization

### 1.1 Identity & Session Management
- **Provider**: Supabase Auth handles identity lifecycle (sign-up, email verification, session refresh, password resets).
- **Session Tokens**: JWTs transmitted via `httpOnly`, `Secure`, `SameSite=Lax` cookies. Next.js server middleware verifies session validity before serving protected routes.
- **Roles**: Enforced via the `User.role` enum (`CUSTOMER` vs `ADMIN`).

### 1.2 Data Ownership & Route Protection
- **Customer Isolation**:
  - Every customer query for `CustomModel`, `Quote`, `Order`, and `Address` must include an explicit `WHERE userId = session.userId` filter.
  - Next.js route handlers (`/api/models/:id`, `/api/quotes/:id`, `/api/orders/:id`) must verify resource ownership before returning data. A mismatch returns `404 Not Found` (to avoid resource enumeration) or `403 Forbidden`.
- **Admin Access Control**:
  - All `/admin/*` pages and `/api/admin/*` API endpoints must verify that `session.user.role === 'ADMIN'`. Unauthorized requests receive an immediate `403 Forbidden`.
  - Admin operations (job approval, pricing rate changes, order cancellations) must produce audit logs containing `adminUserId`, `action`, `resourceId`, and `timestamp`.

---

## 2. Secure Upload Pipeline & Storage Isolation

### 2.1 Pre-Signed Upload Architecture
Custom 3D model files (`.stl`, `.obj`, `.3mf`) must never pass directly through the Next.js API server or serverless compute functions.

```
Client -> (1) Request Signed URL -> Next.js API (/api/uploads/sign)
Next.js API -> Validates extension, mime, size -> Generates Signed PUT URL from Supabase Storage
Client -> (2) Direct Binary PUT -> Supabase Private Storage Bucket
Client -> (3) Register Upload -> Next.js API (/api/models)
```

### 2.2 Server-Side Upload Verification
The `/api/uploads/sign` endpoint enforces:
1. **Extension Whitelist**: Only `.stl`, `.obj`, and `.3mf` (case-insensitive).
2. **MIME Type Whitelist**: `model/stl`, `application/sla`, `model/obj`, `application/octet-stream`.
3. **File Size Cap**: Strict maximum of **50 MB** (`fileSize <= 52,428,800 bytes`).
4. **Randomized Storage Keys**: Storage keys are generated server-side using secure random identifiers:
   - Format: `models/{userId}/{cuid()}-{sanitizedFileName}`
   - Path traversal sequences (`../`, null bytes `%00`) are stripped.

### 2.3 Private Storage Access
- The Supabase Storage bucket is marked **Private**.
- No public read URLs are ever generated or stored in the database.
- The 3D viewer and mesh analysis service access models exclusively via short-lived signed download URLs (lifetime $\le 15\text{ minutes}$).

---

## 3. Sandboxed Mesh Analysis & Resource Protection

Mesh files are untrusted external inputs capable of carrying decompressed zip bombs (in 3MF files), massive polygon counts, or memory exhaustion payloads.

### 3.1 Defense-in-Depth for Mesh Processing
1. **Service Isolation**: Mesh parsing runs solely within the headless Python FastAPI service (`/services/mesh`), completely decoupled from the web application and database credentials.
2. **Execution Timeouts**: FastAPI endpoints process geometry with a strict $15\text{-second}$ timeout. Files exceeding this execution time are aborted.
3. **Memory Limits**: The Python container is capped at $1\text{ GB}$ RAM. If memory spikes, the process crashes without affecting the web app.
4. **Facet Count Limits**: Meshes with greater than $3,000,000$ facets are flagged or rejected to protect viewer rendering performance and slicer memory.

---

## 4. Financial & Payment Integrity (Razorpay)

### 4.1 Server-Side Price Recomputation
- Client-submitted prices are **never trusted**.
- When an order is created at `/api/checkout`:
  - For catalog items: `unitPrice` is read directly from the `Product` database record.
  - For custom prints: `priceTotal` is recomputed using the canonical formula in `lib/pricing/calculator.ts` against the stored `CustomModel` dimensions and `Quote` specifications.
  - The total payable amount sent to Razorpay is strictly calculated on the server.

### 4.2 Webhook Verification & Idempotency
- **Signature Verification**: Razorpay webhook payloads must be verified using HMAC-SHA256 with the secret `PAYMENT_WEBHOOK_SECRET` before processing.
- **Idempotency**:
  - The `paymentRef` (Razorpay Payment ID / Order ID) is stored on the `Order` record with a `UNIQUE` constraint.
  - If a webhook delivers a duplicate event for an already processed `paymentRef`, the handler returns `200 OK` without creating duplicate orders or firing redundant status transitions.
- **Order State Transitions**:
  - An order can only transition from `PENDING_PAYMENT` to `PAID` via a verified webhook event. The client-side payment redirect page **never** modifies order payment status directly.

---

## 5. Secrets Management & Environment Isolation

### 5.1 Environment Variable Access Rules
| Secret Name | Scope | Safe for Client? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public API | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public Anon Client | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-Only Admin | **NO (Server only)** |
| `DATABASE_URL` | Prisma DB Engine | **NO (Server only)** |
| `RAZORPAY_KEY_ID` | Client & Server | Yes |
| `RAZORPAY_KEY_SECRET` | Server-Only Payment API | **NO (Server only)** |
| `RAZORPAY_WEBHOOK_SECRET` | Server-Only Webhook Guard | **NO (Server only)** |
| `MESH_SERVICE_TOKEN` | Internal Service Bearer Auth | **NO (Server only)** |

### 5.2 Safe Handling Rules
- Never commit `.env` or `.env.local` files to git.
- Never prefix sensitive tokens with `NEXT_PUBLIC_`.
- Run automated secret scanning in CI (e.g., git-secrets or Trufflehog).

---

## 6. Threat Matrix & Countermeasures

| Threat Vector | Attack Scenario | Implemented / Planned Countermeasure |
|---|---|---|
| **Mesh Bomb (DoS)** | Attacker uploads highly complex / malformed STL designed to consume 100% CPU. | 50MB file limit, 15s execution timeout in FastAPI, max triangle count validation. |
| **Price Tampering** | Attacker modifies DOM input or client API call to set `price: 1`. | Server completely recomputes price at checkout. Client price values are ignored. |
| **Unauthorized Data Access** | Customer tries to read another user's custom model file or quotes. | All DB queries filter by authenticated `userId`. Storage URLs are signed and short-lived. |
| **Double Fulfillment** | Network retry delivers payment webhook multiple times, duplicating orders. | Idempotent webhook handler with unique `paymentRef` constraint in database. |
| **Admin Route Bypass** | Normal customer accesses `/admin` or sends PATCH to `/api/admin/orders`. | Next.js middleware and route handlers enforce `role === 'ADMIN'` before executing logic. |
| **Malicious File Injection** | Attacker uploads executable or script disguised as STL. | MIME & extension checks on pre-sign; files stored in isolated S3 bucket, served with `Content-Disposition: attachment` or binary stream. |

---

## 7. Security Implementation Status & Checklist

To avoid claiming unbuilt security features are active, controls are explicitly divided:

### Implemented Controls (Current Milestone M0)
- [x] Security architecture and threat model defined.
- [x] Data model schema restricts user data relationships via foreign keys.
- [x] Secrets management rules and environment variable naming established.

### Required Controls (To Be Verified in Milestones M1 - M5)
- [ ] **M1**: Supabase Auth session validation and route guard middleware.
- [ ] **M2**: Server-side file signature validation and 50MB upload clamp.
- [ ] **M2**: Short-lived signed URLs for Supabase Storage buckets.
- [ ] **M2**: FastAPI request timeout (15s) and memory caps.
- [ ] **M3**: Server-side price recalculation at checkout.
- [ ] **M3**: Razorpay HMAC-SHA256 webhook signature verification.
- [ ] **M3**: Idempotent webhook processing using unique `paymentRef`.
- [ ] **M4**: Role-based access control (RBAC) on all `/admin/*` routes.
- [ ] **M5**: Rate limiting on `/api/uploads/sign`, `/api/quotes`, and `/api/auth/*`.
- [ ] **M5**: End-to-end security test suite (tampered price injection test, webhook replay test).
