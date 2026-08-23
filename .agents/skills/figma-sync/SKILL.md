---
name: figma-sync
description: >-
  Sync FANDOR design changes from Figma back to code. Use when the user says
  「同步 Figma」「figma sync」「/figma-sync」, after editing tokens or components
  in the FANDOR Design System Figma file, or when running the Figma→Code automation.
user-invokable: true
argument-hint: "[tokens|btn|footer|top-app-bar|hero|section-header|feature-card|cta-banner|phase1|phase2|phase3|phase4|phase5|phase6|all]"
disable-model-invocation: false
---

# Figma → Code Sync (FANDOR)

Pull visual changes from **FANDOR Design System** in Figma into this repo. Design System `/design-system/` is a mirror — always edit source files, then build.

## Prerequisites

1. **Figma MCP** authenticated in Cursor (Settings → MCP → Figma).
2. **`scripts/figma-config.json`** has `fileKey`, `fileUrl`, and `pilot.*.nodeId` filled in.
3. Load **`figma-design-to-code`** before every `get_design_context` call.

## Config files

| File | Purpose |
|------|---------|
| `scripts/figma-config.json` | Figma file key, node IDs, pilot scope |
| `scripts/figma-mapping.json` | Naming: Figma component ↔ code id ↔ CSS |
| `scripts/components-registry.json` | Variants, cssClasses, usedOn |

## Invocation

User may say:

- `/figma-sync` — sync all pilot nodes (phase 1 + phase 2)
- `/figma-sync btn` — Button only
- `/figma-sync tokens` — color / typography / spacing tokens only
- `/figma-sync footer` — Footer only
- `/figma-sync top-app-bar` — Top App Bar only
- `/figma-sync hero` — Homepage Hero block only
- `/figma-sync phase1` — tokens + btn + footer
- `/figma-sync phase2` — top-app-bar + hero
- `/figma-sync phase5` — join-form + brand-history
- `/figma-sync phase6` — article-card + partner-categories + partner-inquiry

Parse `$ARGUMENTS` if provided; default to `all` (all syncable pilots; excludes Page Templates).

## Workflow (follow in order)

### Step 0 — Validate

1. Read `scripts/figma-config.json`.
2. If `fileKey` is null → STOP. Tell user: complete Figma MCP login, then ask agent to create the design system file and fill config.
3. Resolve target scope from arguments (`all` | `phase1` | `phase2` | individual keys).
4. For each target, if `nodeId` is null → STOP with which label is missing and how to copy node-id from Figma URL.

### Step 1 — Read Figma (MCP)

For each target node, call `get_design_context` with:

- `fileKey` from config
- `nodeId` from `pilot.<target>.nodeId`
- `skillNames`: include `figma-design-to-code`

Treat output as **reference only** — adapt to this project's HTML + CSS, not React/Tailwind.

### Step 2 — Map to code (reuse existing)

**Never invent parallel class names.** Match `scripts/components-registry.json` and `scripts/figma-mapping.json`.

| Target | Primary files | Rules |
|--------|---------------|-------|
| `tokens` | `design-tokens/**/*.json` | Preserve Tokens Studio JSON shape (`$value`, `$type`). Map Figma Variables to paths in `figma-mapping.json` → `figmaVariables`. Then `npm run tokens:build`. |
| `btn` | `css/m3-site.css` (`.btn`, `.btn--*`) | Variants: Filled→`btn--filled`, Outlined→`btn--outlined`, Text→`btn--text`, On Primary→`btn--on-primary`. Use CSS variables, not raw hex. |
| `footer` | `css/m3-site.css` (`.footer*`) | Layout/spacing/colors only unless user asks for copy changes. Copy lives in `content/site/footer.yml`. |
| `top-app-bar` | `css/m3-site.css` (`.top-app-bar*`) | Variants: Default→default, Scrolled→`top-app-bar--scrolled`. Scroll logic stays in `js/site.js`. |
| `hero` | `css/m3-site.css` (`.hero*`) | Layout/spacing/typography. Copy from `content/pages/home.yml` hero block unless user asks for copy sync. |
| `section-header` | `css/m3-site.css` (`.section__*`) | Variants: Default, On Primary→`.section--primary` context. |
| `feature-card` | `css/m3-site.css` (`.feature-card*`) | Icon box, title, desc spacing/colors. |
| `cta-banner` | `css/m3-site.css` (`.cta-banner*`) | Primary section background; button variants on-primary / on-primary-outline. |
| `filter-chip` | `css/m3-site.css` (`.kol-chip*`) | Active/default chip states. |
| `kol-carousel` | `css/m3-site.css` (`.kol-*`) | Carousel layout; copy from `content/pages/home.yml`. |
| `page-hero` | `css/m3-site.css` (`.page-hero*`) | Inner-page centered hero. |
| `join-form` | `css/m3-site.css` (`.form-*`, `.field*`) | Creator join form; structure in `creators.html`. |
| `brand-history` | `css/m3-site.css` (`.history-*`) | Timeline carousel on About page. |
| `article-card` | `css/m3-site.css` (`.article-card*`) | Article grid on `/articles`. |
| `partner-categories` | `css/m3-site.css` (`.category-chip`, `.category-grid`) | 14-category grid on About. |
| `partner-inquiry` | `css/m3-site.css` (`.form-*`) | Vendor inquiry form on `/partners#inquiry`. |

### Step 3 — Build & verify

```bash
npm run build
```

Confirm:

- `/design-system/tokens/` — token swatches
- `/design-system/components/#btn` — button preview
- `/design-system/components/#footer` — footer preview
- Live site `/` footer

### Step 4 — Report

Summarize in Traditional Chinese:

- Which Figma nodes were read
- Files changed
- Token / CSS diffs (brief)
- What to check in browser

## Token sync without Tokens Studio

Primary path for this project (Tokens Studio not installed):

1. Designer edits **Figma Variables** in collection `FANDOR Tokens`.
2. Agent reads Variables / token frame via `get_design_context` on `pilot.tokens.nodeId`.
3. Agent updates matching keys in `design-tokens/` JSON files.
4. Run `npm run tokens:build` → regenerates `css/m3-tokens.css`.

Optional later: install [Tokens Studio](https://tokens.studio/plugin) → designer exports JSON to `design-tokens/` → skip MCP for tokens only.

## Component sync rules

- **Spacing / color / radius / typography** → CSS using existing `--md-sys-*` / `--fandor-*` vars.
- **New variant** → add to Figma component set AND `components-registry.json` variants + new `.btn--*` class.
- **Structure change** (new footer column) → may need `js/site.js` + `footer.yml` — ask user if unclear.
- **Images/icons** from MCP asset URLs → download into `assets/` if committing; never hand-draw SVGs.

## After creating Figma file (one-time setup)

When building the library in Figma for the first time:

1. Load `figma-create-new-file`, `figma-generate-library`, `figma-use` skills.
2. Create file `FANDOR Design System`.
3. Write `fileKey`, `fileUrl` to `scripts/figma-config.json` and `components-registry.json` → `figmaFile`.
4. Phase 1: Variables from `design-tokens/` values.
5. Phase 2: Components `Actions / Button`, `Navigation / Footer` matching code.
6. Copy each component's node-id into `figma-config.json` → `pilot`.
7. Run this skill once to validate round-trip.

## Do not

- Edit `css/m3-tokens.css` by hand (generated).
- Paste Figma MCP React/Tailwind output verbatim.
- Sync `/design-system/` HTML — it rebuilds from `design-system-src/`.
