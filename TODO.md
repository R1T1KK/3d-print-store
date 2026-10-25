# 3D Print Store — Project Progress & TODO Tracker

> **Source of Truth**: [SPEC.md](file:///c:/Users/abhay%20mishra/Downloads/3D_website/SPEC.md) & [IMPLEMENTATION_PLAN.md](file:///c:/Users/abhay%20mishra/Downloads/3D_website/IMPLEMENTATION_PLAN.md)  
> **Last Updated**: 2026-10-24  
> **Overall Progress**: **~40% Completed**

---

## Progress Overview Dashboard

```
M0: Setup & Foundation         [██████████] 100% (Complete)
M1: Storefront & 3D Catalog    [█████████░]  90% (Auth, Gmail OTP, & Middleware Complete)
M2: Custom Upload & Quoting    [██████████] 100% (Complete)
M3: Checkout & Razorpay        [░░░░░░░░░░]   0% (Pending)
M4: Admin Dashboard            [░░░░░░░░░░]   0% (Pending)
M5: Testing & Hardening        [████░░░░░░]  40% (Geometry & Pricing Tests Passing)
M6: Deployment & Launch        [░░░░░░░░░░]   0% (Pending)
```

---

## Detailed Milestone Checklist

### Milestone M0: Setup & Development Foundation
- [x] **Monorepo Directory Layout**: Created `/apps/web`, `/services/mesh`, `/docs`, `.github/workflows`.
- [x] **Documentation System**: Created `SPEC.md`, `ARCHITECTURE.md`, `SECURITY.md`, `UI_UX_GUIDELINES.md`, `AGENTS.md`.
- [x] **Database Schema**: Complete Prisma schema (`apps/web/prisma/schema.prisma`) with models: `User`, `Address`, `Product`, `CustomModel`, `Quote`, `Order`, `OrderItem`.
- [x] **Prisma Configuration**: Prisma 7 datasource configured (`apps/web/prisma.config.ts`) and Prisma client generated.
- [x] **CI/CD Pipeline**: GitHub Actions workflow (`.github/workflows/ci.yml`) for automated lint, typecheck, and python tests on push/PR.
- [x] **Git Remote & Tracking**: Connected to `https://github.com/R1T1KK/3d-print-store.git` on `main` branch.

---

### Milestone M1: Storefront, 3D Catalog, Auth & Cart
- [x] **Interactive 3D WebGL Viewer (`ThreeViewer.tsx`)**:
  - [x] Three.js canvas with simulated $220 \times 220 \times 250\text{ mm}$ printer bed.
  - [x] Orbit controls (360° mouse drag, pinch zoom, pan) and camera view reset.
  - [x] Fullscreen mode toggle with HTML5 Fullscreen API, CSS fallback, and `ResizeObserver`.
  - [x] Material switcher (PLA Prusa Orange, Stealth Black, Cyber Cyan, Gunmetal, Resin Pearl).
  - [x] Wireframe mode toggle and non-destructive Auto-Spin toggle.
  - [x] Telemetry HUD (dimensions, volume, bed fit status).
- [x] **Ready-to-Print Product Catalog (`ProductGrid.tsx`)**:
  - [x] Engineering, robotics, and lifestyle catalog components in INR (`₹`).
  - [x] Category filters (Mechanical, Robotics, Drones, Desk Accessories).
  - [x] Add-to-cart action with instant feedback.
- [x] **Shopping Cart Drawer (`CartDrawer.tsx`)**:
  - [x] Slide-over cart panel with quantity increment/decrement and item removal.
  - [x] Dynamic subtotal and tax calculation in INR.
  - [x] Free shipping progress bar (unlocked at ₹999+).
- [x] **Supabase Auth & Gmail OTP Integration**:
  - [x] Registration page (`/register`) with inline 6-digit OTP verification, password strength meter, and confirmed email account creation.
  - [x] Sign-in page (`/login`) with Password and One-Time Code (OTP) passwordless sign-in tabs.
  - [x] Credential recovery pages: `/forgot-password` with 6-digit OTP password reset and `/reset-password`.
  - [x] Nodemailer Gmail SMTP production delivery with 5-minute expiry, 60s cooldown, and 5-attempt brute-force protection.
  - [x] Next.js auth callback handler (`/auth/callback`) with code exchange and Prisma user synchronization.
  - [x] Customer account portal (`/account`) with editable name/phone/address, order history, and custom 3D model status.
  - [x] Real sign-out action clearing Supabase cookies and returning to home.
- [x] **Route Protection Middleware (`middleware.ts`)**:
  - [x] Unauthenticated root (`/`) visits automatically redirected to `/login`.
  - [x] Protected customer routes (`/account/*`) redirecting unauthenticated users to `/login`.
  - [x] Protected admin routes (`/admin/*`) requiring `ADMIN` role.
  - [x] Dynamic Navbar showing live session avatar and dropdown menu.
- [ ] **Pending for M1**:
  - [ ] **Product Detail Page**: Dynamic route `/catalog/[slug]` for deep-linkable product pages.

---

### Milestone M2: Custom Model Upload, Mesh Analysis & Quoting
- [x] **Client-Side Model Parser (`lib/model-parser.ts`)**:
  - [x] Support for `.stl`, `.obj`, and `.3mf` file formats.
  - [x] Exact signed polyhedral volume calculation ($\text{cm}^3$).
  - [x] Real-time bounding box calculation ($X \times Y \times Z\text{ mm}$).
  - [x] Bed fit validation ($220 \times 220 \times 250\text{ mm}$).
  - [x] Empty file (0 bytes), unsupported format, and >50MB size validation.
  - [x] Memory leak prevention: recursive Three.js disposal (`disposeThreeObject`).
- [x] **Synchronized Preview Engine (`apps/web/app/page.tsx`)**:
  - [x] Uploading a custom model instantly renders it onto the 3D printer bed simulator.
  - [x] Replaces sample model cleanly with zero distortion to true proportions.
  - [x] Reset button restores default sample models.
- [x] **Instant Slicing & Quote Calculator (`InstantQuoteCalculator.tsx`)**:
  - [x] Real-time mass calculation from model volume and material density.
  - [x] SPEC Section 7 deterministic pricing: material cost + machine print time + setup fee.
  - [x] Infill slider (15% to 100%) and layer height selector (0.12mm, 0.20mm, 0.28mm).
  - [x] Add custom quote directly into shopping cart.
- [x] **Private Storage Pipeline (`apps/web/lib/supabase/storage.ts`)**:
  - [x] Secure pre-signed upload URL generator (`POST /api/uploads/sign`) to private `models/` bucket.
  - [x] Strict 50MB file size clamp and extension whitelisting (`.stl`, `.obj`, `.3mf`).
  - [x] Customer-isolated storage key namespaces (`models/{userId}/...`).
- [x] **FastAPI Mesh Geometry Service (`services/mesh/app/analyzer.py`)**:
  - [x] Production `trimesh` geometry analyzer with `POST /analyze`.
  - [x] Watertight / manifold verification with non-manifold fallback diagnostics.
  - [x] Facet count threshold checks ($3,000,000$ triangles) and exact volume ($\text{mm}^3$).
  - [x] Pytest suite with 8 passed tests across manifold, oversized, corrupt, and OBJ formats.
- [x] **Backend Model & Quote Persistence (`/api/models`, `/api/quotes`)**:
  - [x] Model registration endpoint saving `CustomModel` records in Postgres with status `VALID`/`INVALID`.
  - [x] Deterministic server-side quote generator (`lib/pricing/calculator.ts`) computing prices strictly in integer paise.
  - [x] Mandatory admin approval status (`JobStatus.SUBMITTED`) initialized on all quotes.

---

### Milestone M3: Checkout, Razorpay Integration & Order Creation
- [x] **Checkout Page (`/checkout`)**:
  - [x] Responsive layout matching FABRIC3D dark aesthetic.
  - [x] Catalog products & custom 3D quote cart items support.
  - [x] Indian shipping address form (6-digit PIN, 10-digit phone, street, city, state) prefilled from customer profile.
  - [x] Real-time subtotal, Pan-India courier calculation, and free shipping progress bar (threshold ₹999).
  - [x] Razorpay hosted checkout modal integration with test configuration fallback notice.
- [x] **Server-Side Order Validation (`/api/checkout`)**:
  - [x] Strict authentication and ownership enforcement on quotes and models.
  - [x] Deterministic server price recalculation in integer paise (prevents client price tampering).
  - [x] Quote expiry validation & prevention of duplicate quote reuse on already paid orders.
  - [x] Atomic Prisma database transactions creating `Order` (`PENDING_PAYMENT`) and `OrderItem` records.
  - [x] Razorpay Order Session generation with server-only credentials.
- [x] **Razorpay Payment Verification (`/api/checkout/verify`)**:
  - [x] Server-side HMAC-SHA256 signature verification with timing-safe comparison (`crypto.timingSafeEqual`).
  - [x] Atomic order status transition: `PENDING_PAYMENT` $\rightarrow$ `PAID`.
- [x] **Idempotent Webhook Handler (`/api/webhooks/payment`)**:
  - [x] Raw body HMAC-SHA256 signature validation against `x-razorpay-signature`.
  - [x] Deduplication and safe handling of `payment.captured` & `order.paid` events.
- [x] **Order Success & Account Tracking (`/order-success/[id]`, `/account`)**:
  - [x] Authenticated order invoice view with real-time payment status badge, itemized breakdown, and shipping details.
  - [x] Account order history clickable links directly to order confirmation pages.
- [x] **Automated Test Suite (`apps/web/test-checkout.mjs`)**:
  - [x] 6 test suites covering payment signatures, webhook signatures, idempotency, price tampering, quote expiry/ownership, and Indian address validators.

---

### Milestone M4: Admin Dashboard & Custom Job Review
- [ ] **Pending for M4**:
  - [ ] **Admin Authorization Guard**: Restrict `/admin/*` to `Role.ADMIN`.
  - [ ] **Catalog Product Management (`/admin/products`)**: CRUD interface for catalog items.
  - [ ] **Custom Print Job Queue (`/admin/jobs`)**:
    - [ ] Table of custom print requests with status (`SUBMITTED`, `APPROVED`, `REJECTED`).
    - [ ] Inspection drawer with 3D model viewer, volume, and watertight diagnostics.
    - [ ] Approve / Reject buttons with mandatory reason notes.
  - [ ] **Order Fulfillment Tracker (`/admin/orders`)**: State updates (`IN_PRODUCTION` $\rightarrow$ `SHIPPED` $\rightarrow$ `DELIVERED`).

---

### Milestone M5: Hardening, Automated Testing & Accessibility
- [x] **Client 3D Sync & Geometry Tests (`test-model-sync.mjs`)**: 8 tests passing (STL/OBJ/3MF, volume, bounds, limits).
- [ ] **Pending for M5**:
  - [ ] **Vitest Pricing Suite**: Unit tests for pricing formulas and minimum order floors.
  - [ ] **Pytest Mesh Suite**: Backend tests for corrupt, hollow, and oversized meshes in FastAPI.
  - [ ] **Playwright E2E Suite**: End-to-end checkout and custom upload automated tests.
  - [ ] **Security Hardening**: Rate limiting on upload signing, signed URL expiry check, `npm audit` verification.

---

### Milestone M6: Deployment & Launch Verification
- [ ] **Pending for M6**:
  - [ ] Vercel production deployment for Next.js app.
  - [ ] Containerized deployment for FastAPI mesh service (Railway / Fly.io / Docker).
  - [ ] Supabase production database migration & private storage bucket provisioning.
  - [ ] Razorpay live keys configuration & webhook URL registration.
  - [ ] End-to-end smoke test purchase.

---

## Required Environment Variables Checklist

| Variable | Service | Purpose | Status |
| :--- | :--- | :--- | :---: |
| `DATABASE_URL` | Web | Postgres connection (Supabase) | ⏳ Template ready in `.env.example` |
| `NEXT_PUBLIC_SUPABASE_URL` | Web | Supabase Project API endpoint | ⏳ Template ready |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Web | Public client auth key | ⏳ Template ready |
| `SUPABASE_SERVICE_ROLE_KEY` | Web | Server-side storage/admin access | ⏳ Template ready |
| `MESH_SERVICE_URL` | Web | URL for FastAPI analyzer | ⏳ Default `http://localhost:8000` |
| `MESH_SERVICE_TOKEN` | Web / Mesh | Internal microservice auth secret | ⏳ Template ready |
| `RAZORPAY_KEY_ID` | Web | Razorpay payment gateway key | ⏳ Template ready |
| `RAZORPAY_KEY_SECRET` | Web | Razorpay server secret | ⏳ Template ready |
| `PAYMENT_WEBHOOK_SECRET` | Web | HMAC verification for payment webhooks | ⏳ Template ready |
