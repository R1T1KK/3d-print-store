# 3D Print Store — Project Progress & TODO Tracker

> **Source of Truth**: [SPEC.md](file:///c:/Users/abhay%20mishra/Downloads/3D_website/SPEC.md) & [IMPLEMENTATION_PLAN.md](file:///c:/Users/abhay%20mishra/Downloads/3D_website/IMPLEMENTATION_PLAN.md)  
> **Last Updated**: 2026-10-23  
> **Overall Progress**: **~35% Completed**

---

## Progress Overview Dashboard

```
M0: Setup & Foundation         [██████████] 100% (Complete)
M1: Storefront & 3D Catalog    [████████░░]  85% (Auth & Middleware Complete)
M2: Custom Upload & Quoting    [████░░░░░░]  40% (Client 3D Sync & Slicing Done)
M3: Checkout & Razorpay        [░░░░░░░░░░]   0% (Pending)
M4: Admin Dashboard            [░░░░░░░░░░]   0% (Pending)
M5: Testing & Hardening        [██░░░░░░░░]  20% (Format Tests Passing)
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
  - [x] Orbit controls (360° mouse drag, pinch zoom, pan).
  - [x] Material switcher (PLA Prusa Orange, Stealth Black, Cyber Cyan, Gunmetal, Resin Pearl).
  - [x] Wireframe mode toggle and Auto-Spin toggle.
  - [x] Telemetry HUD (dimensions, volume, bed fit status).
- [x] **Ready-to-Print Product Catalog (`ProductGrid.tsx`)**:
  - [x] Engineering, robotics, and lifestyle catalog components in INR (`₹`).
  - [x] Category filters (Mechanical, Robotics, Drones, Desk Accessories).
  - [x] Add-to-cart action with instant feedback.
- [x] **Shopping Cart Drawer (`CartDrawer.tsx`)**:
  - [x] Slide-over cart panel with quantity increment/decrement and item removal.
  - [x] Dynamic subtotal and tax calculation in INR.
  - [x] Free shipping progress bar (unlocked at ₹999+).
- [x] **Supabase Auth Integration**:
  - [x] Registration page (`/register`) with name, email, password strength meter, confirmation, and email verification prompt.
  - [x] Sign-in page (`/login`) with error sanitization, show/hide password, and remember-me option.
  - [x] Credential recovery pages: `/forgot-password` and `/reset-password`.
  - [x] Next.js auth callback handler (`/auth/callback`) with code exchange and Prisma user synchronization.
  - [x] Customer account portal (`/account`) with editable name/phone/address, order history, and custom 3D model status.
  - [x] Real sign-out action clearing Supabase cookies and returning to home.
- [x] **Route Protection Middleware (`middleware.ts`)**:
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
- [ ] **Pending for M2**:
  - [ ] **Supabase Storage Uploads**: Implement `/api/uploads/sign` to generate 15-minute secure pre-signed URLs to private `models/` bucket.
  - [ ] **FastAPI Mesh Service Implementation (`services/mesh/app/analyzer.py`)**:
    - [ ] Complete `trimesh` geometry analyzer for `POST /analyze`.
    - [ ] Server-side manifold / watertight verification.
    - [ ] Triangle count sanity checks and server-side volume computation.
  - [ ] **Backend Quote Persistence (`/api/quotes`)**: Save `CustomModel` and `Quote` rows in Postgres.

---

### Milestone M3: Checkout, Razorpay Integration & Order Creation
- [x] **Client Checkout Modal Prototype**: Simulated Razorpay trigger and payment confirmation state.
- [ ] **Pending for M3**:
  - [ ] **Checkout Page (`/checkout`)**: Shipping address collection and tax invoice breakdown.
  - [ ] **Server Price Recalculation (`/api/checkout`)**: Never trust client prices; recompute on server.
  - [ ] **Razorpay SDK Integration**: Generate Razorpay Order IDs via test keys.
  - [ ] **Payment Webhook Handler (`/api/webhooks/payment`)**:
    - [ ] HMAC-SHA256 signature verification.
    - [ ] Idempotent order state transition: `PENDING_PAYMENT` $\rightarrow$ `PAID`.
  - [ ] **Order Success & Tracking Page (`/order-success/[id]`)**.

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
