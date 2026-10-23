# UI_UX_GUIDELINES.md: Design System & User Experience Guidelines

> **Status**: Living Design Specification  
> **Source of Truth**: [SPEC.md](file:///c:/Users/abhay%20mishra/Downloads/3D_website/SPEC.md)  
> **Target Audience**: Frontend Engineers & AI Coding Agents

---

## 1. Design Philosophy: High-Precision Engineering Aesthetic

The **3D Print Store** interface must convey craftsmanship, technical rigor, and tactile physical manufacturing. It avoids generic flat e-commerce templates and cartoonish color schemes.

### Core Principles
1. **Precision & Transparency**: Dimensions, tolerances, layer heights, and material densities are treated as primary product attributes, not hidden footnotes.
2. **Interactive 3D as a First-Class Citizen**: The 3D viewport is an active workspace, not a passive thumbnail. Users should intuitively pan, rotate, and inspect wall geometry and bounding fit.
3. **Calibrated Restraint**: Restrict animations to purposeful micro-interactions (hover elevations, smooth mesh rotation, progress spinners). Avoid disorienting parallax or gratuitous transitions that detract from clarity.
4. **Branding Restraint**: Do not invent fantasy brand names or mascots. Use clean architectural typography (e.g., `3D PRINT STUDIO` or `STUDIO // 3D`) with minimal geometric marks.

---

## 2. Design Tokens & Visual Hierarchy

### 2.1 Color Palette (Dark-Mode Primary with High-Precision Accents)

The application utilizes a dark slate/zinc baseline paired with functional industrial accents:

| Token Name | Hex / Class | Semantic Usage |
|---|---|---|
| **Background Deep** | `#090A0F` (`bg-slate-950`) | Global page background, canvas backdrop |
| **Surface Raised** | `#12151E` (`bg-slate-900`) | Cards, panels, navigation bar, dialogs |
| **Surface Elevated** | `#1C2230` (`bg-slate-800/80`) | Hovered items, active tab highlights, form fields |
| **Border Subtle** | `#262E40` (`border-slate-800`) | Card borders, dividing rules, viewport frames |
| **Border Focus** | `#3B82F6` (`border-blue-500`) | Input focus rings, selected material cards |
| **Text Primary** | `#F8FAFC` (`text-slate-50`) | Primary headlines, pricing totals, titles |
| **Text Secondary** | `#94A3B8` (`text-slate-400`) | Subheadings, dimensional units, metadata |
| **Text Muted** | `#64748B` (`text-slate-500`) | Inactive states, helper text, timestamps |
| **Accent Primary** | `#2563EB` / `#3B82F6` | Primary action buttons, active tab indicators |
| **Status Warning** | `#F59E0B` (`text-amber-400`) | Non-watertight mesh warning, bed fit warning |
| **Status Danger** | `#EF4444` (`text-rose-500`) | Corrupt mesh rejection, exceeding build volume |
| **Status Success** | `#10B981` (`text-emerald-400`)| Watertight verified, payment paid, model valid |

### 2.2 Typography
- **Primary Body & Headings**: Inter or Geist Sans. Clean, modern, neutral sans-serif.
- **Technical & Metric Readouts**: Font featuring tabular numerals (e.g., `font-mono`, Geist Mono, or JetBrains Mono) for:
  - Coordinate axes ($X, Y, Z$ mm).
  - Volume measurements ($\text{mm}^3, \text{cm}^3$).
  - Pricing values ($\text{₹}$ integer amounts).
  - Infill percentages and layer heights.

### 2.3 Spacing & Radius
- **Spacing Scale**: 4px (`gap-1`), 8px (`gap-2`), 12px (`gap-3`), 16px (`gap-4`), 24px (`gap-6`), 32px (`gap-8`).
- **Corner Radii**: Standardize on `rounded-lg` (8px) for buttons, inputs, and cards. Use `rounded-xl` (12px) for main viewport containers and modal dialogs. Avoid pill-shaped buttons for high-tech industrial aesthetics.

---

## 3. Component & Page Layout Guidelines

### 3.1 Global Navigation Bar
- Fixed or sticky top bar with subtle blur (`backdrop-blur-md bg-slate-950/80 border-b border-slate-800`).
- Left: Architectural typography brand mark.
- Center: Navigation links (`Catalog`, `Custom Print`, `Materials Guide`).
- Right: Cart drawer trigger with item badge, User Account avatar / Sign-in trigger.

---

### 3.2 Product Catalog & Product Detail Page
- **Catalog Grid**: Responsive 1-col (mobile), 2-col (tablet), 3- or 4-col (desktop) cards.
- **Product Card**:
  - Top: Aspect-square image container with subtle hover zoom or quick 3D preview toggle.
  - Middle: Product name, material badges (e.g., `PLA`, `PETG`), stock indicator (`In Stock` vs `Made to Order`).
  - Bottom: Price in INR (`₹499`), and secondary `View Details` button.
- **Product Detail Layout**:
  - **Left (Desktop 60%)**: Interactive 3D Canvas rendering the product GLB with orbital controls, rotation lock, and zoom clamp.
  - **Right (Desktop 40%)**: Product title, description, material and color swatch selectors, quantity stepper, and prominent `Add to Cart` CTA.

---

### 3.3 The 3D Viewport Component (`ThreeCanvas.tsx`)

The 3D viewer is a critical user-facing touchpoint:

1. **Scene Setup**:
   - Camera: Perspective camera with a gentle default orbit (isometric angle: 45° elevation, 45° azimuth).
   - Lighting: Multi-point neutral studio lighting (soft key, ambient fill, rim light) to highlight surface contours.
   - Ground Plane: Subtle 10mm grid with muted axis lines ($X$=Red, $Y$=Green, $Z$=Blue muted).
2. **Build Volume Representation (For Custom Prints)**:
   - Render a wireframe bounding volume indicating printer bed bounds: **$220 \times 220 \times 250\text{ mm}$**.
   - If the uploaded model exceeds any axis, highlight the wireframe in pulsing **amber/red** and show a floating alert badge: *"Model exceeds build plate limits"*.
3. **Viewport Controls**:
   - Top-right overlay toolbar:
     - Reset Camera (re-centers model).
     - Toggle Wireframe Mode (shows mesh triangulation).
     - Toggle Build Plate Boundaries.
   - Bottom-left overlay:
     - Real-time bounding box readout: `W: 120mm · D: 85mm · H: 45mm`.
4. **Interaction Rules**:
   - Left Click / Drag: Orbit.
   - Right Click / Two-Finger Drag: Pan.
   - Scroll Wheel / Pinch: Zoom (clamped to prevent clipping inside mesh or flying out).

---

### 3.4 Custom Print & Instant Quote Page (`custom-print/page.tsx`)

A two-column layout on desktop, stacked on mobile:

#### Left Column (Interactive 3D Stage)
- **Empty State**: Drag-and-drop zone with accepted format badges (`.STL`, `.OBJ`, `.3MF`) and a clear **50 MB** maximum limit.
- **Active State**: 3D viewer showing the user's mesh centered on the print bed.
- **Diagnostic Pill**:
  - Watertight Mesh: Green pill with checkmark (`Watertight: Ready to Print`).
  - Non-watertight Mesh: Amber warning pill (`Warning: Non-watertight mesh. May require manual slicing adjustments`).
  - Inverted Normals / Errors: Red pill (`File Corrupt or Unreadable`).

#### Right Column (Specification & Quote Form)
1. **Material Selector**: Segmented selector or card picker for available filaments (**PLA**, **PETG**) with material properties (e.g., *"PLA: Rigid, detailed"* vs *"PETG: Durable, heat-resistant"*).
2. **Color Palette Swatches**: Selectable color chips (e.g., Matte Black, Signal White, Slate Grey, Olive Green).
3. **Infill Percentage**: Interactive slider with standard presets ($15\%$, $20\%$, $40\%$, $100\%$).
4. **Layer Height Selector**: Dropdown or buttons ($0.12\text{ mm}$ Fine, $0.20\text{ mm}$ Standard, $0.28\text{ mm}$ Draft).
5. **Quantity Counter**: Stepper component ($1$ to $50$).
6. **Price Summary Card**:
   - Transparent line-item breakdown:
     - Material estimate ($X\text{ grams}$ at $\text{₹}Y/\text{g}$).
     - Machine run time ($Z\text{ hrs}$ at $\text{₹}W/\text{hr}$).
     - Setup & preparation fee ($\text{₹}50$).
     - Margin & Subtotal.
   - Prominent Total: `₹ Total (incl. taxes)`.
   - Admin Approval Note: *"Every custom job is manually reviewed by an engineer before production starts."*
   - CTA: `Add Custom Print to Cart`.

---

### 3.5 Shopping Cart & Checkout Overview
- Clear segregation of catalog items vs custom quoted prints.
- Custom print items display a mini 2D preview thumbnail, configured material, color, infill, and the unique Quote ID.
- Price integrity note: *"Custom prices valid for 7 days"*.

---

### 3.6 Admin Panel (`/admin/*`)
- **Theme**: High-density, data-focused administrative layout.
- **Custom Job Queue**:
  - Table of pending jobs with customer email, submission date, model dimensions, and calculated price.
  - Detail Inspection Drawer/Modal:
    - Interactive 3D preview of the model.
    - Mesh diagnostics report (volume, facet count, manifold status).
    - Action buttons: `Approve Job` (green), `Reject with Note` (red), or `Request Revision`.

---

## 4. UI States & Feedback Standards

| State | Implementation Requirement |
|---|---|
| **Loading** | Use animated pulse skeletons matching exact card/element dimensions. In 3D viewports, render an orbiting geometric wireframe with percentage upload/processing progress. |
| **Empty State** | Never display a blank page. Provide clear visual cues, informative helper text, and a direct primary CTA (e.g., *"No custom models uploaded yet — Upload your first STL"*). |
| **Error State** | Informative, non-technical recovery messaging. Explain *why* an action failed (e.g., *"File exceeds 50 MB limit"* or *"Corrupt 3MF header"*) with a `Try Again` action. |
| **Success State** | Confirmation banner or modal with distinct confirmation numbers and clear next steps (e.g., *"Order #3D-1049 placed. You can track status in your dashboard"*). |

---

## 5. Accessibility & Responsiveness

1. **Responsive Viewport Handling**:
   - On mobile screens ($<768\text{px}$), the 3D viewport height is locked to $320\text{px}$ to prevent scroll-trapping when the user attempts to swipe down the page.
   - Touch gestures within the 3D canvas require a dedicated "Tap to Interact" overlay on mobile to allow smooth page scrolling.
2. **Keyboard Navigation**:
   - All interactive controls (sliders, swatches, buttons, table rows) must be accessible via `Tab` and `Enter`/`Space`.
   - Focus states must feature a visible $2\text{px}$ ring with high contrast (`focus-visible:ring-2 focus-visible:ring-blue-500`).
3. **Screen Readers**:
   - 3D canvases must include an `aria-label` summarizing the model: e.g., `aria-label="3D Model Viewer for Custom Bracket. Width 80 millimeters, Height 40 millimeters."`.
