# Design System Specification

## 1. Overview & Creative North Star: "The Digital Institution"

This design system is engineered to position KonectIA as Mexico’s most authoritative professional services marketplace. We are moving beyond the "utility app" aesthetic to embrace an **Editorial Fintech** approach. 

The **Creative North Star** for this system is **"The Digital Institution."** 

Like a high-end private bank or a premium consultancy, the interface must feel established, secure, and impeccably organized. We achieve this through "Institutional Asymmetry"—using a rigid underlying grid but breaking it with overlapping "floating" cards, sophisticated tonal layering instead of harsh borders, and a high-contrast typography scale that prioritizes readability and prestige. 

The experience should feel like a curated physical portfolio: tactile, layered, and premium.

---

## 2. Color & Surface Philosophy

The color palette is rooted in the "Deep Navy" of the brand's heritage, balanced by high-tech cyan and energetic orange accents.

### The "No-Line" Rule
To achieve a premium, custom feel, **1px solid borders are strictly prohibited for sectioning.** Boundaries must be defined through background color shifts. Use `surface-container-low` sections sitting on a `background` base to create natural breaks.

### Surface Hierarchy & Tonal Layering
Treat the UI as physical layers of stacked material.
- **Level 0 (Base):** `background` (#f7fafc)
- **Level 1 (Sections):** `surface-container` (#ebeef0)
- **Level 2 (Cards):** `surface-container-lowest` (#ffffff) for maximum "pop" and focus.
- **Level 3 (Interactive/Floating):** `surface-bright` (#f7fafc) with Glassmorphism.

### Glass & Gradient Implementation
- **Glassmorphism:** For floating headers or persistent navigation, use `surface-container-lowest` at 80% opacity with a `20px` backdrop-blur.
- **Signature Textures:** Main CTAs and Hero backgrounds should utilize a subtle radial gradient transitioning from `primary` (#00030a) to `primary_container` (#0a1d37). This adds a "soul" to the interface that flat colors cannot replicate.

---

## 3. Typography Scale

We utilize a dual-typeface system to balance authority with accessibility. **Manrope** provides a geometric, modern edge for high-impact headlines, while **Inter** ensures relentless legibility for transactional data.

| Role | Token | Font | Size | Weight | Tracking |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display** | `display-lg` | Manrope | 3.5rem | 700 (Bold) | -0.02em |
| **Headline** | `headline-md` | Manrope | 1.75rem | 600 (Semi) | -0.01em |
| **Title** | `title-lg` | Inter | 1.375rem | 600 (Semi) | 0 |
| **Body** | `body-lg` | Inter | 1rem | 400 (Reg) | 0 |
| **Label** | `label-md` | Inter | 0.75rem | 500 (Med) | 0.05em |

*Design Note: Use `tertiary_container` (Orange) sparingly for title accents or "Verified" status labels to draw the eye without disrupting the institutional calm.*

---

## 4. Elevation & Depth

Hierarchy is communicated through **Tonal Layering** and **Ambient Light**, not structural lines.

- **The Layering Principle:** Place a `surface-container-lowest` card on a `surface-container-low` section. The change in hex code creates a soft, sophisticated lift.
- **Ambient Shadows:** For floating elements (like a service provider's profile card), use an extra-diffused shadow: `box-shadow: 0 20px 40px rgba(8, 28, 54, 0.06);`. Note the tint—the shadow uses a low-opacity version of `on_primary_fixed` to feel like natural light passing through glass.
- **The Ghost Border:** If a boundary is required for accessibility in forms, use the `outline_variant` token at **20% opacity**. Never use a 100% opaque border.

---

## 5. Component Logic

### Buttons (The "Call to Confidence")
- **Primary:** `primary` background with `on_primary` text. Use `xl` (0.75rem) roundedness. Add a subtle inner-glow gradient for a "fintech-adjacent" premium feel.
- **Secondary:** `secondary_container` (#2dbcfe) background. This vibrant cyan provides high contrast for "Contact" or "Message" actions.
- **Tertiary:** `tertiary_container` (#3c0c00) text with no background. Reserved for destructive or low-priority utility actions.

### Cards & Marketplace Lists
- **Rule:** Forbid divider lines. 
- **Separation:** Use 24px vertical white space (Spacing Scale) or alternating background shifts (`surface` vs `surface-container-low`).
- **Verified Badges:** Use a small `secondary` (Cyan) shield icon with a `surface-container-highest` background to signify trust without overwhelming the content.

### Professional Forms
- **Input Fields:** Use `surface-container-low` for the field background. Labels must use `label-md` in `on_surface_variant`. 
- **Focus State:** Transitions from a ghost border to a 2px `secondary` (Cyan) bottom-border only. This keeps the form feeling "light" and modern.

### Trust Indicators
- **Institutional Bar:** A full-width `primary_container` strip featuring monochrome partner logos at 40% opacity. This acts as an "anchor" of trust at the bottom of hero sections.

---

## 6. Do’s and Don’ts

### Do
- **Do use asymmetrical layouts:** Align text to the left but offset the accompanying image/card by 40px to create a custom, editorial feel.
- **Do prioritize "Breathing Room":** If you think there is enough whitespace, add 15% more. High-end services require space to "breathe."
- **Do use "Surface Tint":** Apply a 2% `surface_tint` overlay to white cards to make them feel integrated with the navy brand.

### Don't
- **Don't use pure black:** Use `primary` (#00030a) for text and backgrounds to maintain the deep navy "institutional" warmth.
- **Don't use hard corners:** Stick strictly to the `xl` (0.75rem) and `lg` (0.5rem) roundedness scale to keep the "accessible" brand promise.
- **Don't use standard drop shadows:** Avoid the default CSS `0 2px 4px` look. It feels cheap and "out-of-the-box." Always use the diffuse ambient shadow specified in Section 4.