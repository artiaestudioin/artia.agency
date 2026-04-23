# Design System Document: High-End Editorial Strategy

## 1. Overview & Creative North Star: "The Architectural Blueprints"

This design system is built upon a Creative North Star of **Architectural Precision**. Moving away from generic marketing templates, this system treats digital space as a physical environment. By utilizing the structured sidebar navigation from high-end boutique aesthetics and infusing it with a rigorous, professional blue-based palette, we create an experience that feels both creatively fluid and structurally sound.

We break the "standard grid" by employing **intentional asymmetry** and **tonal depth**. Rather than using lines to divide content, we use shifting planes of blue and slate to guide the eye. This mimics an editorial layout—like a luxury architectural magazine—where white space (or in this case, "blue space") is a functional element, not just a gap.

**Key Visual Pillars:**
*   **Monolithic Navigation:** A permanent anchor that provides a sense of reliability and scale.
*   **Motion as Texture:** GSAP-powered transitions that make the interface feel alive and reactive.
*   **Subtractive Borders:** Defining areas through color contrast and depth rather than structural strokes.

---

## 2. Color Palette & Atmospheric Surface Rules

The palette is a sophisticated transition from deep, authoritative Navy (`primary: #00113a`) to airy, professional Slate (`background: #f7f9fb`).

### Surface Hierarchy & Nesting
To move beyond "flat" UI, we utilize a system of layered surfaces. Think of the interface as stacked sheets of translucent material.
*   **Level 0 (Foundation):** `surface` (#f7f9fb) – The primary canvas.
*   **Level 1 (Sections):** `surface_container_low` (#f2f4f6) – Used for large content blocks.
*   **Level 2 (Active Cards):** `surface_container_highest` (#e0e3e5) – Used for interactive or highlighted elements.

### The "No-Line" Rule
**Explicit Instruction:** Do not use 1px solid borders for sectioning. Boundaries must be defined solely through background color shifts or the "Ghost Border" fallback. 
*   *Instead of a line:* Use a transition from `surface` to `surface_container`.
*   *Signature Textures:* Use a subtle linear gradient from `primary` (#00113a) to `primary_container` (#002366) for hero backgrounds to add "visual soul."

### The Glass & Gradient Rule
For floating UI elements (like the navigation sidebar or modern overlays), use Glassmorphism.
*   **Value:** Set `surface_container_lowest` (#ffffff) to 80% opacity with a `24px` backdrop-blur. This creates a "frosted glass" effect that integrates the foreground with the background.

---

## 3. Typography: The Editorial Voice

We pair **Manrope** (Display/Headlines) with **Inter** (Body/Labels) to balance creative character with high-utility legibility.

*   **Display-LG (Manrope, 3.5rem):** Reserved for high-impact brand statements. Should utilize the "Blur-to-Clear" GSAP effect on page load.
*   **Headline-MD (Manrope, 1.75rem):** Used for section titles. Always paired with generous vertical padding to allow the type to "breathe."
*   **Body-MD (Inter, 0.875rem):** The workhorse for all professional copy. Set with a slightly increased line-height (1.6) to maintain an premium editorial feel.
*   **Label-MD (Inter, 0.75rem):** Used for micro-copy and tags, often in `on_surface_variant` (#444650) for a sophisticated, subdued hierarchy.

---

## 4. Elevation & Depth: Tonal Layering

Traditional drop shadows are forbidden. We use **Tonal Layering** to convey hierarchy.

*   **The Layering Principle:** Place a `surface_container_lowest` (#ffffff) card on a `surface_container_low` (#f2f4f6) section. The slight shift in brightness creates a soft, natural lift.
*   **Ambient Shadows:** If a floating effect is required (e.g., the Floating Action Button), use an extra-diffused shadow: `box-shadow: 0 20px 40px rgba(0, 17, 58, 0.06);`. The shadow color must be a tinted version of our `primary` blue, never pure black/grey.
*   **The Ghost Border:** If a boundary is strictly required for accessibility, use the `outline_variant` (#c5c6d2) at **15% opacity**. This creates a "suggestion" of a border without breaking the editorial flow.

---

## 5. Component Strategy

### Navigation Sidebar (The Anchor)
*   **Structure:** Fixed left, width `280px`. 
*   **Visuals:** `surface_container_lowest` with a `15%` opacity ghost border on the right. 
*   **Typography:** Title-SM for links. Active state uses `primary` text with a 2px vertical bar on the left.

### Buttons (The Statement)
*   **Primary:** Solid `primary` (#00113a) background, `on_primary` (#ffffff) text. Corner radius: `0.25rem` (sm).
*   **Secondary:** `surface_container_highest` background. No border.
*   **Floating Action Button (FAB):** Inspired by the Lunaya contact pattern. Circular (`rounded: full`), `secondary` (#2552ca) color, with an Ambient Shadow.

### Cards & Information Blocks
*   **Rule:** Forbid divider lines. Use vertical white space (32px, 48px, or 64px) or subtle shifts between `surface_container` tiers to separate content.
*   **Animation:** Use GSAP to stagger the entry of cards with a slight `y` offset (20px) and a fade-in.

### Input Fields
*   **Default:** `surface_container_low` background with a `0.25rem` radius.
*   **Focus State:** Shift background to `surface_container_lowest` and apply a `100%` opaque `outline_variant` ghost border.

---

## 6. Do's and Don'ts

### Do:
*   **Do** use asymmetrical layouts where text blocks are offset from images to create a dynamic, creative feel.
*   **Do** implement the "Blur-to-Clear" GSAP transition for the brand name 'ARTIA' to emphasize professional mystery and reveal.
*   **Do** use `primary_fixed_dim` (#b3c5ff) for subtle background accents in dark-themed sections.

### Don't:
*   **Don't** use high-contrast black borders or separators.
*   **Don't** use standard "Material Design" drop shadows; they feel too "app-like" and not "editorial."
*   **Don't** clutter the footer. Keep it minimalist with `tertiary` (#051522) background and `on_tertiary_container` (#8191a2) text for a quiet, professional finish.