## Plan: Business Info section + 3 legal pages on Coming Soon

### 1. Update `src/pages/ComingSoon.tsx`
Add a new "Business Info" section below the existing hero block (still inside the overlay container), plus a footer with three legal links. No changes to hidden `austin` shortcut, email signup, background, or animations.

Structure appended after the existing `<motion.p>` "Founder-operated..." line:

- **Business Info section** — bordered card using `bg-card` (#2C2C2C) with Cinzel heading and Cormorant Garamond body:
  - Business name (Cinzel, bronze accent)
  - Service description paragraph (verbatim)
  - Pricing paragraph (verbatim) + "Request a Quote" button → `mailto:info@gravedetail.net?subject=Quote Request`
  - Contact block: phone (`tel:5735455759`) and email (`mailto:info@gravedetail.net`) as bronze links
- **Footer** — thin top border, granite text, centered links to `/privacy-policy`, `/terms-of-service`, `/refund-policy` separated by `·`

### 2. Create three new page components (verbatim content)
All use the shared layout: dark background, max-w-3xl container, "← Back" link to `/`, Cinzel h1, Cormorant Garamond body, bronze sub-labels, granite "Last updated" line. No shared component extracted — each page is self-contained to keep scope isolated.

- `src/pages/legal/PrivacyPolicy.tsx`
- `src/pages/legal/TermsOfService.tsx`
- `src/pages/legal/RefundPolicy.tsx`

Content is pasted exactly as provided, with the labeled leads ("Information I collect:", "Services:", etc.) rendered as Cinzel uppercase bronze sub-headings above each paragraph for readability. No paraphrasing of body text.

### 3. Register routes in `src/App.tsx`
Add three imports and three `<Route>` entries alongside existing public routes:
- `/privacy-policy` → `PrivacyPolicy`
- `/terms-of-service` → `TermsOfService`
- `/refund-policy` → `RefundPolicy`

No changes to any other route, admin layout, Supabase config, or existing pages/components.

### Design tokens used
- Bg `bg-background` (#141414), card `bg-card` (#2C2C2C), text `text-foreground` (#E8E4DF), accent `text-bronze` (#C9976B)
- Fonts: `font-cinzel` headings, `font-garamond` body — already loaded globally

### Out of scope
- No schema/RLS/edge-function changes
- No edits to Home, About, Services, LegalDisclosures, or any other existing page
- No new colors, fonts, or design tokens
