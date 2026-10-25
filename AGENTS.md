# AGENTS.md: AI Coding Agent Guidelines

> **Notice**: This document defines operational standards, conventions, and rules of engagement for AI coding agents working on the **3D Print Store** codebase.
> 
> **Primary Authority**: [SPEC.md](file:///c:/Users/abhay%20mishra/Downloads/3D_website/SPEC.md) is the primary source of truth for product requirements, architecture, and business logic. This document governs implementation discipline and code standards. If a conflict arises between this document and `SPEC.md`, **stop and raise the discrepancy before modifying code**.

---

## 1. Operating Rules for Agents

### 1.1 Documentation-First Workflow
1. **Always read relevant documentation first**:
   - Consult [SPEC.md](file:///c:/Users/abhay%20mishra/Downloads/3D_website/SPEC.md) to understand business rules, data schemas, and acceptance criteria.
   - Consult [ARCHITECTURE.md](file:///c:/Users/abhay%20mishra/Downloads/3D_website/ARCHITECTURE.md) for module boundaries and data flow.
   - Consult [SECURITY.md](file:///c:/Users/abhay%20mishra/Downloads/3D_website/SECURITY.md) before writing API routes, upload handlers, or payment hooks.
   - Consult [UI_UX_GUIDELINES.md](file:///c:/Users/abhay%20mishra/Downloads/3D_website/UI_UX_GUIDELINES.md) before building or styling components.
   - Consult [IMPLEMENTATION_PLAN.md](file:///c:/Users/abhay%20mishra/Downloads/3D_website/IMPLEMENTATION_PLAN.md) to adhere to the active milestone.
2. **State Scope Explicitly**:
   - At the beginning of every task, identify which milestone and section of `SPEC.md` you are addressing (e.g., *"Implementing Section 5.4: Custom Model Upload - Milestone M2"*).
   - Do not implement multiple milestones simultaneously. Focus on the single active task.
3. **Never Guess Unresolved Decisions**:
   - If a business requirement or technical dependency is not documented in `SPEC.md` or the supporting docs, flag it as an open question. Do not invent pricing rates, third-party integrations, or database mutations.

### 1.2 Boundary & Safety Constraints
- **Preserve Existing SPEC**: Never modify, overwrite, or delete `SPEC.md`.
- **Schema & Formula Stability**: Never modify `prisma/schema.prisma` or the pricing formulas in `lib/pricing/` without proposing the exact diff and rationale first.
- **No Secrets in Code**: Never commit credentials, private tokens, or API secrets. Access secrets exclusively via server-side environment variables. Never expose private keys using `NEXT_PUBLIC_` prefixes.
- **Do Not Overwrite Unrelated Work**: Make surgical, localized edits. Preserve unrelated files, comments, and existing tests.
- **No False Claims**: Do not mark a milestone or feature as "complete" or "implemented" unless working code, typechecks, and tests exist and pass.

---

## 2. Technology Stack & Directory Conventions

The project is structured as a monorepo containing the web application and an internal mesh analysis service:

```
/
├── apps/
│   └── web/                   # Next.js 14+ (App Router), TypeScript, Tailwind CSS
│       ├── app/               # Next.js App Router (pages, layouts, route handlers)
│       │   ├── (storefront)/  # Customer-facing shopping & 3D catalog routes
│       │   ├── (auth)/        # Supabase authentication flows
│       │   ├── (account)/     # Customer order history & saved profile
│       │   ├── (admin)/       # Protected admin management dashboard
│       │   └── api/           # Backend API route handlers
│       ├── components/        # React components
│       │   ├── ui/            # Reusable primitives (buttons, dialogs, inputs)
│       │   ├── viewer/        # Three.js / React Three Fiber 3D viewer components
│       │   ├── catalog/       # Product cards, grids, category filters
│       │   ├── custom/        # File upload dropzone, quote calculator, bed-fit alerts
│       │   └── admin/         # Job queue tables, status modals, diagnostic badges
│       ├── lib/               # Shared utilities
│       │   ├── supabase/      # Supabase client (browser, server, admin client)
│       │   ├── prisma.ts      # Prisma database client singleton
│       │   ├── pricing/       # Deterministic pricing engine & rate configurations
│       │   └── mesh-client.ts # HTTP client for the FastAPI mesh service
│       └── prisma/            # Prisma schema, seeds, and migrations
├── services/
│   └── mesh/                  # Python FastAPI service for mesh geometry analysis
│       ├── app/               # FastAPI endpoints & trimesh processing logic
│       ├── tests/             # pytest suite for mesh parsing, volume, and watertight tests
│       └── requirements.txt   # Python dependencies (fastapi, trimesh, uvicorn)
├── docs/                      # Supporting architectural and planning documents
└── tests/                     # End-to-end integration tests (Playwright)
```

---

## 3. Coding Standards & Conventions

### 3.1 TypeScript & React (Next.js)
- **Strict Typing**: TypeScript `strict: true`. Avoid `any`. Define explicit interfaces and types for API request/response bodies, database transfer objects, and component props.
- **Server Components by Default**: In Next.js App Router, keep components as React Server Components (RSC) unless interactivity is required:
  - Add `"use client"` directive **only** when using browser hooks (`useState`, `useEffect`, `useRef`), event listeners, or Three.js WebGL canvas rendering.
- **3D Canvas Isolation**: Isolate Three.js / React Three Fiber `<Canvas>` elements into dedicated Client Components with dynamic imports (`next/dynamic` with `ssr: false`) to avoid server-side WebGL hydration errors.
- **File & Symbol Naming**:
  - React Components: `PascalCase.tsx` (e.g., `ModelViewer.tsx`, `QuoteSummary.tsx`).
  - Route files: Next.js conventions (`page.tsx`, `layout.tsx`, `route.ts`, `loading.tsx`, `error.tsx`).
  - Helper libraries & utilities: `kebab-case.ts` or `camelCase.ts` (e.g., `pricing-calculator.ts`, `storage.ts`).
  - Types/Interfaces: `PascalCase` (e.g., `QuoteInput`, `MeshReport`, `OrderItemWithDetails`).

### 3.2 Styling (Tailwind CSS)
- Follow the design system defined in [UI_UX_GUIDELINES.md](file:///c:/Users/abhay%20mishra/Downloads/3D_website/UI_UX_GUIDELINES.md).
- Use semantic utility classes with consistent spacing scales (4px, 8px, 12px, 16px, 24px, 32px).
- Avoid ad-hoc arbitrary Tailwind values (`w-[347px]`) when standard tokens suffice.
- Ensure dark mode and high-contrast accessibility standards are maintained.

### 3.3 Python (Mesh Service)
- Python 3.10+ with type hints across all FastAPI route signatures and utility functions.
- Handle malformed or non-manifold meshes gracefully using `try/except` blocks returning structured JSON responses rather than throwing 500 errors.
- Enforce processing timeouts and maximum triangle/memory limits to prevent denial-of-service on large uploads.

---

## 4. Verification & Quality Gates

Before declaring any coding sub-task complete, the agent must run and report:

1. **Type Checking**:
   - `npm run typecheck` (or `npx tsc --noEmit`) in `apps/web`. Zero type errors allowed.
2. **Linting**:
   - `npm run lint` in `apps/web`. Zero unhandled lint errors.
3. **Automated Tests**:
   - Run Vitest for pricing calculation unit tests and webhook handlers: `npm run test`.
   - Run pytest for mesh service endpoints: `pytest services/mesh/tests`.
   - Unit tests are **mandatory** whenever touching `lib/pricing/` or `/api/webhooks/payment`.

---

## 5. Agent Reporting Format

At the conclusion of every execution turn, provide a concise summary using the following format:

```markdown
### Summary of Changes
- [File Path]: Description of modifications.

### Verification Results
- Typecheck: [Passed / Not Applicable]
- Lint: [Passed / Not Applicable]
- Unit / Integration Tests: [X passed, 0 failed]

### Limitations & Next Steps
- Highlight any manual prerequisites (e.g., environment variables needed in Supabase or Razorpay dashboard).
- Identify the immediate next task in IMPLEMENTATION_PLAN.md.
```
