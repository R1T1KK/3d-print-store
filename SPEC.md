# SPEC.md: 3D Print Store

> Source of truth for humans and AI agents working in this repo. If code and this file disagree, raise it and update the spec rather than guessing.

## 1. Overview

An online store that sells ready-made 3D printed objects and lets customers upload their own 3D models (STL/OBJ/3MF) to get an instant quote and order a custom print.

**Goals**
- Customers can browse, preview in 3D, and buy catalog items.
- Customers can upload a model, see it in 3D, pick material/color/infill, get a price, and pay.
- The owner/admin can manage products, review custom jobs, and track orders.

**Non-goals (MVP)**
- Multi-vendor marketplace
- Native mobile apps
- Automatic printer control or print-farm scheduling
- Real-time slicer quotes (Phase 2)

## 2. Users and roles

| Role | Capabilities |
|---|---|
| Guest | Browse catalog, view product pages, use the 3D viewer |
| Customer | Everything a guest can, plus upload models, get quotes, place orders, view order history |
| Admin | Manage products, approve/reject custom jobs, update order status, view all orders |

## 3. Tech stack (assumptions, confirm or change before building)

- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS
- **3D viewer:** three.js via react-three-fiber (@react-three/drei for loaders and controls)
- **Backend:** Next.js route handlers for app logic; separate Python FastAPI service for mesh analysis
- **Mesh analysis:** `trimesh` (volume, bounding box, watertight check)
- **Database:** PostgreSQL (Supabase or Neon), accessed with Prisma
- **File storage:** S3-compatible bucket (Supabase Storage or Cloudflare R2), private, accessed via signed URLs
- **Auth:** Auth.js or Supabase Auth (email + password, Google optional)
- **Payments:** Stripe or Razorpay hosted checkout with webhooks
- **Email:** Resend or similar transactional provider
- **Hosting:** Vercel (web) + container host for the Python service
- **Testing:** Vitest (unit), Playwright (end-to-end), pytest (mesh service)

## 4. Architecture

```
Browser (Next.js UI + three.js viewer)
   |            \
   |             \--> Object storage (signed upload/download URLs)
   v
Next.js API routes ----> PostgreSQL (Prisma)
   |        \
   |         \--> Payment provider (checkout session + webhook)
   v
Mesh service (FastAPI + trimesh)
```

**Upload flow**
1. Client requests a signed upload URL from the API (type and size validated server-side).
2. Client uploads the file directly to storage.
3. Client notifies the API; the API creates a `CustomModel` record with status `PENDING`.
4. The API calls the mesh service with the file's signed URL.
5. The mesh service returns volume, dimensions, and mesh checks; the API stores them and sets status `VALID` or `INVALID`.
6. The client polls or refetches, then shows the viewer and the quote form.

## 5. Features and acceptance criteria

### 5.1 Catalog
- List products with image, name, price, and a category filter.
- Product page shows a 3D preview (GLB/STL), description, material and color options, stock, and add-to-cart.
- **Done when:** a visitor can find a product, rotate it in 3D, and add it to the cart on mobile and desktop.

### 5.2 Accounts
- Sign up, log in, log out, password reset.
- Account page lists orders and saved addresses.
- **Done when:** protected routes redirect unauthenticated users and customers cannot see each other's data.

### 5.3 Cart and checkout
- Cart holds catalog items and accepted custom quotes.
- Checkout collects shipping address and redirects to hosted payment.
- An order is marked `PAID` only by the payment webhook, never by the browser redirect.
- **Done when:** a test payment creates exactly one paid order, even if the webhook is delivered twice.

### 5.4 Custom model upload
- Accepted formats: `.stl`, `.obj`, `.3mf`. Maximum file size: 50 MB (configurable).
- Viewer shows the model with orbit controls, dimensions in mm, and a bed-size fit warning.
- Rejected with a clear message: non-manifold/non-watertight meshes (Phase 1 may warn instead of block), models larger than the build volume, empty or corrupt files.
- **Done when:** a valid STL uploads, renders, and returns dimensions and volume within 1% of a reference tool.

### 5.5 Quote
- Inputs: material, color, infill %, layer height, quantity.
- Output: price breakdown (material, machine time, setup, margin) and an expiry (default 7 days).
- Pricing formula is in section 7.
- **Done when:** changing any input updates the price without a page reload, and the server recomputes the price at checkout (never trust the client's number).

### 5.6 Admin panel
- Product CRUD with image and model upload.
- Custom jobs queue: view model, quote, and mesh report; approve or reject with a note.
- Order list with status updates: `PAID` → `IN_PRODUCTION` → `SHIPPED` → `DELIVERED` (or `CANCELLED`, `REFUNDED`).
- Customer emails on key status changes.
- **Done when:** an admin can take a custom order from upload to shipped without touching the database.

## 6. Data model (Prisma sketch)

```prisma
enum Role { CUSTOMER ADMIN }
enum ModelStatus { PENDING VALID INVALID }
enum JobStatus { SUBMITTED APPROVED REJECTED }
enum OrderStatus { PENDING_PAYMENT PAID IN_PRODUCTION SHIPPED DELIVERED CANCELLED REFUNDED }

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  role      Role     @default(CUSTOMER)
  createdAt DateTime @default(now())
  addresses Address[]
  models    CustomModel[]
  orders    Order[]
}

model Address {
  id String @id @default(cuid())
  userId String
  user User @relation(fields: [userId], references: [id])
  line1 String
  line2 String?
  city String
  state String
  postalCode String
  country String
  phone String?
}

model Product {
  id          String @id @default(cuid())
  slug        String @unique
  name        String
  description String
  basePrice   Int    // smallest currency unit
  currency    String @default("INR")
  stock       Int    @default(0)
  modelUrl    String? // GLB/STL for preview
  images      String[]
  materials   String[]
  active      Boolean @default(true)
}

model CustomModel {
  id         String @id @default(cuid())
  userId     String
  user       User   @relation(fields: [userId], references: [id])
  fileKey    String // storage key, never a public URL
  fileName   String
  fileSize   Int
  status     ModelStatus @default(PENDING)
  volumeMm3  Float?
  sizeXmm    Float?
  sizeYmm    Float?
  sizeZmm    Float?
  isWatertight Boolean?
  meshReport Json?
  createdAt  DateTime @default(now())
  quotes     Quote[]
}

model Quote {
  id          String @id @default(cuid())
  modelId     String
  model       CustomModel @relation(fields: [modelId], references: [id])
  material    String
  color       String
  infillPct   Int
  layerHeight Float
  quantity    Int @default(1)
  priceTotal  Int
  breakdown   Json
  expiresAt   DateTime
  jobStatus   JobStatus @default(SUBMITTED)
  adminNote   String?
}

model Order {
  id         String @id @default(cuid())
  userId     String
  user       User   @relation(fields: [userId], references: [id])
  status     OrderStatus @default(PENDING_PAYMENT)
  total      Int
  currency   String
  paymentRef String? @unique // idempotency for webhooks
  addressJson Json
  createdAt  DateTime @default(now())
  items      OrderItem[]
}

model OrderItem {
  id        String @id @default(cuid())
  orderId   String
  order     Order  @relation(fields: [orderId], references: [id])
  productId String?
  quoteId   String?
  quantity  Int
  unitPrice Int
}
```

An `OrderItem` references exactly one of `productId` or `quoteId`. Enforce this in application code and tests.

## 7. Pricing

```
material_cost = volume_cm3 * infill_factor * density_g_per_cm3 * cost_per_gram
machine_cost  = estimated_print_hours * machine_rate_per_hour
subtotal      = material_cost + machine_cost + setup_fee
price         = max(minimum_order_price, subtotal * (1 + margin_pct)) * quantity
```

- Phase 1 estimates print hours from volume (simple linear model, tunable in config).
- Phase 2 replaces this with slicer-reported time and filament use.
- All rates, densities, and margins live in a config file or table, not hardcoded in components.
- Prices are stored as integers in the smallest currency unit.
- Unit tests must cover: minimum price, quantity scaling, each material, and rounding.

## 8. API surface (initial)

| Method | Route | Purpose | Auth |
|---|---|---|---|
| GET | `/api/products` | List products | public |
| GET | `/api/products/:slug` | Product detail | public |
| POST | `/api/uploads/sign` | Get signed upload URL | customer |
| POST | `/api/models` | Register uploaded model, trigger analysis | customer |
| GET | `/api/models/:id` | Model status and analysis | owner |
| POST | `/api/quotes` | Create/recompute a quote | owner |
| POST | `/api/checkout` | Create order and payment session | customer |
| POST | `/api/webhooks/payment` | Payment provider webhook | signature-verified |
| GET | `/api/orders` | Own orders | customer |
| GET/PATCH | `/api/admin/orders` | List/update orders | admin |
| GET/PATCH | `/api/admin/jobs` | Custom job review | admin |
| CRUD | `/api/admin/products` | Product management | admin |

Mesh service (internal only): `POST /analyze` with `{ fileUrl }` returning `{ volumeMm3, bbox, isWatertight, issues[] }`.

## 9. Security requirements

- Validate file extension, MIME type, and size on the server; do not trust the client.
- Store uploads in a private bucket; serve only through short-lived signed URLs.
- Parse meshes only in the mesh service, with timeouts and memory limits.
- Verify payment webhook signatures and make handlers idempotent using `paymentRef`.
- Recompute prices server-side at checkout.
- Enforce ownership checks on every model, quote, and order read.
- Rate-limit auth, upload, and quote endpoints.
- Secrets live in environment variables only; never commit them or paste them into prompts.
- Terms of service: users confirm they have rights to uploaded models; prohibited items (for example weapons or weapon parts) are not printed. Admins can reject jobs.

## 10. Suggested repo structure

```
/apps/web            Next.js app
  /app               routes (storefront, account, admin, api)
  /components        UI and 3D viewer components
  /lib               pricing, db client, auth, storage helpers
  /prisma            schema and migrations
/services/mesh       FastAPI + trimesh service
/docs                SPEC.md, decisions, runbooks
/tests               e2e tests
```

## 11. Environment variables (names only)

```
DATABASE_URL
AUTH_SECRET
STORAGE_ENDPOINT, STORAGE_BUCKET, STORAGE_ACCESS_KEY, STORAGE_SECRET_KEY
PAYMENT_PUBLIC_KEY, PAYMENT_SECRET_KEY, PAYMENT_WEBHOOK_SECRET
MESH_SERVICE_URL, MESH_SERVICE_TOKEN
EMAIL_API_KEY
```

## 12. Milestones

| # | Milestone | Exit criteria |
|---|---|---|
| M0 | Setup | Repo, CI, DB connected, schema migrated |
| M1 | Storefront | Catalog, product page with 3D preview, auth, cart |
| M2 | Custom upload | Upload, viewer, mesh analysis, quote |
| M3 | Checkout | Payments, webhook, order creation, emails |
| M4 | Admin | Product CRUD, job review, order management |
| M5 | Hardening | Tests green, security checklist passed, mobile checked |
| M6 | Launch | Production deploy, monitoring, test orders |

## 13. Working agreement for AI agents

- Read this file before starting any task, and list which section(s) the task covers.
- One task per run (for example, "implement section 5.4 upload endpoint"); do not build unrelated features.
- Do not change the data model, pricing formula, or API contracts without proposing the change first.
- Write or update tests with every change; pricing and webhook code require unit tests.
- Never hardcode secrets or rates; use env vars and config.
- Keep changes small and committed on a feature branch with a clear message.
- When something in this spec is ambiguous, state the assumption in the pull request or reply rather than silently choosing.

## 14. Open questions (to resolve before M2)

- Which payment provider and currencies at launch?
- Which printer(s) and materials are offered (this sets build volume, densities, and rates)?
- Block or only warn on non-watertight meshes in the MVP?
- Shipping rules and return policy for custom prints?
- Is manual admin approval required for every custom job, or only flagged ones?
