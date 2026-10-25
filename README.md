# 3D Print Store

An e-commerce platform for selling ready-made 3D printed objects and accepting custom 3D model upload orders.

> **Specification**: See [`SPEC.md`](./SPEC.md) for product requirements, data models, and business logic.  
> **Architecture**: See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for system design and data flow.  
> **Implementation**: See [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) for milestones and task breakdown.  
> **Security**: See [`SECURITY.md`](./SECURITY.md) for auth, upload, and payment security policies.  
> **UI/UX**: See [`UI_UX_GUIDELINES.md`](./UI_UX_GUIDELINES.md) for design system and component standards.  
> **Agents**: See [`AGENTS.md`](./AGENTS.md) for AI coding agent rules and coding standards.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS |
| Database | PostgreSQL via Supabase, managed with Prisma ORM |
| Auth | Supabase Auth |
| Storage | Supabase Storage (private bucket) |
| 3D Viewer | React Three Fiber + @react-three/drei |
| Mesh Service | Python 3.13, FastAPI, trimesh |
| Payments | Razorpay (INR) |
| Email | Resend (deferred, post-MVP) |
| Hosting | Vercel (web) + container host (mesh service) |

---

## Monorepo Structure

```
/
├── apps/web/          # Next.js web application
├── services/mesh/     # Python FastAPI mesh analysis service
├── tests/             # End-to-end Playwright tests (added M5)
├── docs/              # Additional documentation
├── .github/workflows/ # GitHub Actions CI
└── SPEC.md            # Source of truth — do not modify
```

---

## Local Development Setup

### Prerequisites

- Node.js 20+
- Python 3.13+
- A Supabase project (for Milestone M1+)

### 1. Clone & configure environment

```bash
git clone <your-repo-url>
cd 3D_website

# Copy and fill in the environment variables
cp .env.example apps/web/.env.local
# Edit apps/web/.env.local with your Supabase credentials
```

### 2. Start the Next.js web application

```bash
cd apps/web
npm install
npm run dev
# Open http://localhost:3000
```

### 3. Start the FastAPI mesh analysis service

```bash
cd services/mesh

# Create and activate a virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS / Linux

# Install dependencies
pip install -r requirements.txt

# Start the service
uvicorn app.main:app --reload --port 8000
# Open http://localhost:8000/health
# Open http://localhost:8000/docs
```

### 4. Run Prisma schema validation (requires DATABASE_URL in .env.local)

```bash
cd apps/web
npx prisma validate
npx prisma generate
# When you have a real Supabase connection:
# npx prisma migrate dev --name init
```

---

## Available Scripts

### Web application (from `apps/web/`)

| Script | Description |
|---|---|
| `npm run dev` | Start Next.js development server |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint via next lint |
| `npm run typecheck` | Run TypeScript compiler (no emit) |

### Root workspace (from project root)

| Script | Description |
|---|---|
| `npm run dev` | Start web app dev server |
| `npm run lint` | Lint web app |
| `npm run typecheck` | Type-check web app |

### Mesh service (from `services/mesh/`)

| Command | Description |
|---|---|
| `uvicorn app.main:app --reload` | Start dev server |
| `pytest tests/ -v` | Run test suite |

---

## Current Status

**Milestone M0 — Complete**: Monorepo structure, Next.js scaffold, Prisma schema, FastAPI health check, CI configuration.

**Next**: Milestone M1 — Storefront, catalog, 3D viewer, Supabase Auth, cart.
