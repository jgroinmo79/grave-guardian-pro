## Refactor brand color hex values to semantic tokens

Replace ~213 hardcoded hex occurrences across the codebase with the existing Tailwind/CSS-variable tokens so the design system stays the single source of truth.

### Token mapping

| Hex (current)              | Replacement                              |
|----------------------------|------------------------------------------|
| `#C9976B` (bright bronze)  | `bg-bronze` / `text-bronze` / `border-bronze` (or `hsl(var(--bronze))` in inline styles) |
| `#7A5C3E` (aged bronze)    | `bg-patina` / `text-patina` / `border-patina` |
| `#D5A984` (light bronze)   | `bg-bronze-light` / `text-bronze-light`  |
| `#141414` (polished black) | `bg-background` / `text-background`      |
| `#2C2C2C` (raw granite)    | `bg-card` / `border-card` / `bg-secondary` |
| `#6B6B6B` (granite)        | `bg-granite` / `text-granite` / `border-granite` |
| `#3a3a3a` (border)         | `border-border` (or `border-muted`)      |
| `#E8E4DF` (cream)          | `text-foreground` / `text-brand-cream`   |

Light/dark accent edges already covered by `--muted`, `--border`, `--card`. No new tokens need to be added.

### Files to refactor

Most usage is inline `style={{ ... }}` props plus a few arbitrary Tailwind classes:

- `src/pages/Home.tsx`
- `src/pages/About.tsx`
- `src/pages/Services.tsx`
- `src/pages/ComingSoon.tsx`
- `src/pages/LegalDisclosures.tsx`
- `src/pages/AdminSignups.tsx`
- `src/pages/Auth.tsx`
- `src/pages/FrameBuilder.tsx` (keep the `BRONZE` constants object as semantic refs but switch Tailwind classes to `bg-bronze`, `text-background`, etc.)
- `src/components/PublicNavbar.tsx`
- `src/components/PublicFooter.tsx`
- `src/pages/admin/TravelZones.tsx` (Leaflet markers — these need real color strings, so swap to `getComputedStyle` reads of the CSS variables OR keep the hex with an inline comment; recommend reading the var via `getComputedStyle(document.documentElement).getPropertyValue('--bronze')` and wrapping with `hsl(...)` since Leaflet can't consume tokens directly)

### Conversion patterns

1. **Tailwind utility classes** — straight swap:
   - `bg-[#C9976B]` → `bg-bronze`
   - `text-[#141414]` → `text-background`
   - `border-[#C9976B]` → `border-bronze`

2. **Inline `style` props with static colors** — replace with Tailwind classes where possible; if a CSS variable is still needed (e.g. dynamic value), use `hsl(var(--bronze))`.
   - `style={{ backgroundColor: "#C9976B" }}` → `className="bg-bronze"`
   - `style={{ color: "#C9976B" }}` → `className="text-bronze"`

3. **Hover handlers (`onMouseEnter` / `onMouseLeave`)** — replace with Tailwind hover utilities to remove the JS:
   - `style={{ backgroundColor: "#C9976B" }} onMouseEnter={..."#7A5C3E"...}` → `className="bg-bronze hover:bg-patina transition-colors"`
   - For text hovers: `className="text-bronze hover:text-patina transition-colors"`

4. **Border edges (`#3a3a3a`, `#2C2C2C`)** — use `border border-border` or `border border-muted`.

### Out of scope

- No visual redesign — colors stay perceptually identical (tokens already resolve to the same HSL).
- Leaflet color arrays stay literal hex for now (documented), since Leaflet's options API doesn't consume CSS variables. Only the brand-related circle marker color (`#C9976B`) will be derived from the CSS variable at runtime.
- `FrameBuilder.tsx`'s exported canvas drawing also needs literal hex for `canvas.fillStyle`; the in-file `BRONZE` const stays as the source of truth there.

### Verification

After edits, grep for the targeted hex values — the only remaining matches should be the Leaflet zone-color palette and the `FrameBuilder` canvas constants. Then load Home, About, Services, ComingSoon, Auth, and admin pages in the preview to confirm visuals are unchanged.