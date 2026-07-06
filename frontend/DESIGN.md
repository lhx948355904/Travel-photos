# Lumora Design System

> This file is the reusable visual specification for Lumora pages. The homepage
> hero is the source of truth for the brand mood: cinematic, quiet, immersive,
> glass-like, and focused. Other pages should reuse the same typography, color
> logic, radius scale, spacing rhythm, and liquid-glass surface language.

## 1. Brand Direction

Lumora is a mindfulness and focus app. The interface should feel calm,
cinematic, spacious, and intentional.

- Mood: immersive, soft, atmospheric, focused.
- Visual language: fullscreen media, gentle glass surfaces, white-on-video text,
  restrained controls, slow opacity transitions.
- Avoid: loud gradients, dense dashboards on marketing pages, heavy borders,
  harsh shadows, decorative blobs, overly saturated accent colors.

## 2. Typography

### Primary Display Font

Use **Instrument Serif** from Google Fonts.

Load it in `index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">
```

Global base:

```css
html,
body {
  font-family: 'Instrument Serif', serif;
}
```

### Font Roles

- Logo: `Instrument Serif`, italic, white, `text-xl sm:text-2xl`.
- Hero headings: `Instrument Serif`, regular, large, elegant line height.
- Body text, buttons, stats, nav links, inputs, and labels:
  `system-ui, sans-serif` inline or through a utility class.

### Type Scale

| Token | Tailwind / CSS | Use |
| --- | --- | --- |
| `logo` | `text-xl sm:text-2xl italic` | Brand mark |
| `hero-title` | `text-4xl sm:text-5xl md:text-7xl lg:text-[5.5rem] leading-[1.1]` | Homepage hero headline |
| `body-lead` | `text-sm sm:text-base leading-relaxed` | Hero subtext and page lead copy |
| `nav-link` | `text-sm` | Desktop navigation |
| `stat-label` | `text-xs sm:text-sm` | Bottom stats and supporting metadata |

## 3. Color System

Lumora's default surface is dark media with white foreground. The third video
mode introduces a dark-ink text variant.

### Core Colors

| Token | Value | Use |
| --- | --- | --- |
| `black` | `#000000` | Section fallback background before video loads |
| `white` | `#ffffff` | Main text, CTA fills, nav text, stats |
| `white-90` | `rgba(255,255,255,0.9)` | Nav links |
| `white-80` | `rgba(255,255,255,0.8)` | Hover text and supporting text |
| `white-70` | `rgba(255,255,255,0.7)` | Bottom stats |
| `white-50` | `rgba(255,255,255,0.5)` | Inactive video switcher |
| `glass-fill` | `rgba(255,255,255,0.01)` | Liquid glass base |
| `glass-highlight` | `rgba(255,255,255,0.45)` | Glass border highlight |
| `deep-woods-ink` | `#182C41` | Text color when video index `2` is active |
| `mobile-backdrop` | `rgba(0,0,0,0.6)` | Mobile menu overlay |

### Color Rules

- Navbar and bottom stats are always white, including Deep Woods mode.
- Hero content changes to `#182C41` only when the third video is active.
- Primary CTAs use solid white fill with dark text.
- Do not introduce a strong secondary accent unless the page has a clear product
  state that needs semantic color.

## 4. Radius And Shape

Lumora favors soft pills for controls and restrained radius elsewhere.

| Token | Value | Use |
| --- | --- | --- |
| `radius-none` | `0px` | Fullscreen sections and media layers |
| `radius-sm` | `8px` | Small repeated cards or utility panels |
| `radius-md` | `12px` | Compact form surfaces if not pill-shaped |
| `radius-lg` | `16px` | Larger panels on secondary pages |
| `radius-pill` | `9999px` | Nav pill, badge, email input, buttons |
| `radius-full` | `9999px` | Circular icon buttons |

Homepage controls should primarily use `rounded-full`. For non-hero pages, keep
cards at `8px` radius unless a glass pill or modal pattern clearly calls for a
larger shape.

## 5. Spacing And Layout

### Global Layout Principles

- Use generous vertical breathing room.
- Keep the first viewport immersive and uncluttered.
- Prefer full-width bands and constrained inner content.
- Do not nest cards inside cards.
- Use media as the primary visual asset when possible.

### Homepage Section Container

```tsx
<section className="relative w-full h-screen overflow-hidden bg-black">
```

Rules:

- The homepage is a single viewport-height section.
- No page scroll on the hero.
- Black background prevents a flash before videos load.
- Content layer uses a full-height flex column.

### Z-Index Layering

| Layer | Z-Index | Content |
| --- | --- | --- |
| Background videos | `0` | Four fullscreen video layers |
| PNG overlay | `1` | Transparent cinematic foreground overlay |
| Main content | `2` | Nav, hero content, stats |
| Mobile menu | `50` | Fullscreen mobile navigation overlay |

## 6. Liquid Glass Component

Use `.liquid-glass` for nav pills, badges, icon buttons, and the email capture
container.

```css
.liquid-glass {
  background: rgba(255, 255, 255, 0.01);
  background-blend-mode: luminosity;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  border: none;
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;
}

.liquid-glass::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1.4px;
  background: linear-gradient(
    180deg,
    rgba(255,255,255,0.45) 0%,
    rgba(255,255,255,0.15) 20%,
    rgba(255,255,255,0) 40%,
    rgba(255,255,255,0) 60%,
    rgba(255,255,255,0.15) 80%,
    rgba(255,255,255,0.45) 100%
  );
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}
```

### Usage Rules

- Always pair `.liquid-glass` with an explicit radius, usually `rounded-full`.
- Keep glass surfaces subtle. The effect should support the video, not compete
  with it.
- Use solid white for the final CTA inside a glass container.

## 7. Motion System

Motion should be slow, smooth, and quiet.

| Motion | Duration | Easing | Use |
| --- | --- | --- | --- |
| Video crossfade | `1000ms` | `ease-in-out` | Active background video transition |
| Deep Woods color shift | `700ms` | default/ease | Hero content color transition |
| Mobile menu entrance | `500ms` | `cubic-bezier(0.4,0,0.2,1)` | Links and CTA |
| Hamburger icon switch | `300ms` | default/ease | Menu/X rotate and scale |
| PNG overlay bob | `3000ms` | `ease-in-out infinite` | Cinematic overlay movement |

### Overlay Animation

```css
@keyframes train-bob {
  0%,
  100% {
    transform: translateY(0) scale(1.03);
  }
  50% {
    transform: translateY(-6px) scale(1.03);
  }
}

.train-bob {
  animation: train-bob 3s ease-in-out infinite;
}
```

## 8. Homepage Assets

### Background Videos

Stack four fullscreen looping videos absolutely. Only the active video has
`opacity-100`; all others have `opacity-0`.

All videos must use:

```tsx
autoPlay
muted
loop
playsInline
```

| Index | Label | URL |
| --- | --- | --- |
| `0` | Golden Hour | `https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260702_081127_0992a171-d3c6-4978-8213-0ec5df8b6d63.mp4` |
| `1` | Still Water | `https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260702_092026_dd05b805-ea0f-40b2-8c52-332b88502592.mp4` |
| `2` | Deep Woods | `https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260702_081042_df7202bf-bd80-4b2b-bbc6-1f09ba2870e9.mp4` |
| `3` | Quiet Dawn | `https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260702_080959_4cac5234-3573-464e-a5b7-76b94b8a7d61.mp4` |

### Transparent PNG Overlay

Place over the videos as an absolute fullscreen image at `z-index: 1`.

```text
https://soft-zoom-63098134.figma.site/_assets/v11/0b4a435b2df2747593c43d7a1c9b4578f7d8d90c.png
```

Apply `.train-bob` and `scale(1.03)` to avoid edge gaps during motion.

## 9. Homepage Components

### Navigation

Desktop:

- Left: `Lumora`, white, italic, `text-xl sm:text-2xl`.
- Right: `.liquid-glass` pill with links:
  `How It Works`, `Features`, `Pricing`, `Community`.
- Link style: `text-white/90 text-sm`, hover to `text-white`.
- Final CTA: solid white `Get Started` button.

Mobile:

- Right: `.liquid-glass` circular or pill icon button.
- Use Lucide React `Menu` and `X`.
- Icon animation:
  - `Menu`: rotate out to `90deg`, scale to `0.75`.
  - `X`: rotate in from `-90deg`.
  - Duration: `300ms`.

### Mobile Menu Overlay

- Fixed fullscreen overlay at `z-50`.
- Backdrop: `bg-black/60 backdrop-blur-sm`.
- Center panel fills viewport and centers content.
- Links: white, `text-3xl`, staggered by `50ms`.
- Entrance delay sequence: `100ms`, `150ms`, `200ms`, `250ms`, `300ms`.
- Link motion: `translate-y-4` to `translate-y-0`.
- CTA at bottom with scale animation.
- Duration: `500ms`.
- Easing: `cubic-bezier(0.4,0,0.2,1)`.

### Hero Content

Hero content is centered below navigation.

- Badge: `.liquid-glass rounded-full`.
- Badge text: `Over 10,000 minds already finding their clarity`.
- Heading:

```text
Clarity in an Endlessly
Noisy Universe
```

- Heading classes:
  `text-4xl sm:text-5xl md:text-7xl lg:text-[5.5rem] leading-[1.1] max-w-4xl`.
- Subtext:

```text
Rise above the chaos of pings, infinite scrolling, and relentless demands. Discover how to protect your presence and create with intention.
```

- Subtext max width: `max-w-xl`.
- Subtext line height: `leading-relaxed`.

### Email Capture

- Container: `.liquid-glass rounded-full`.
- Mobile max width: `max-w-[320px]`.
- Small screens and up: `sm:max-w-sm`.
- Input placeholder: `Your Best Email`.
- CTA: solid white `Get Early Access` button.
- Use `system-ui, sans-serif` for input and button text.

### Video Switcher

- Row of four text buttons.
- Labels: `Golden Hour`, `Still Water`, `Deep Woods`, `Quiet Dawn`.
- Active button:
  - Solid color text.
  - Visible bottom border.
- Inactive button:
  - `opacity-50`.
  - Transparent bottom border.
  - Hover to `opacity-80`.

### Bottom Stats

Push stats to the bottom with a `flex-1` spacer.

Stats:

- `60+ Deep Sessions`
- `12,000+ Creators`
- `4.8 User Satisfaction`
- `Intentional-First Design`

Style:

- `text-white/70`
- `text-xs sm:text-sm`
- `font-family: system-ui, sans-serif`
- Pipe dividers `|` hidden on mobile.
- Stats may wrap naturally on small screens.

## 10. Deep Woods Mode

When `activeVideo === 2`, hero content switches from white to
`deep-woods-ink` (`#182C41`).

Affected:

- Badge text
- Heading
- Subtext
- Email input text
- Video switcher labels and active border

Unaffected:

- Navbar remains white.
- Bottom stats remain white.

Transition duration: `700ms`.

## 11. Video Switching Logic

Use two state values:

```tsx
const [activeVideo, setActiveVideo] = useState(0);
const [isTransitioning, setIsTransitioning] = useState(false);
```

Rules:

- Default active video: `0`.
- On video button click:
  - Ignore if clicked video is already active.
  - Ignore if `isTransitioning` is `true`.
  - Set the new active video.
  - Start a `1000ms` cooldown matching the CSS crossfade.
  - During cooldown, ignore extra clicks.

Example:

```tsx
const handleVideoChange = (index: number) => {
  if (index === activeVideo || isTransitioning) return;

  setActiveVideo(index);
  setIsTransitioning(true);

  window.setTimeout(() => {
    setIsTransitioning(false);
  }, 1000);
};
```

## 12. Responsive Behavior

Mobile:

- Smaller type scale.
- Tighter horizontal padding.
- Hamburger navigation.
- Stats wrap naturally.
- Email capture stays compact, max `320px`.

Tablet and desktop:

- Larger heading.
- More generous padding.
- Inline nav pill.
- Stats use pipe separators.
- Hero content remains centered and cinematic.

## 13. Reuse Rules For Other Pages

Other Lumora pages should reuse:

- Instrument Serif for brand/display moments.
- `system-ui, sans-serif` for utility text.
- The same white/dark-ink color logic.
- `.liquid-glass` for floating controls or subtle page chrome.
- Pill CTAs for primary actions.
- Slow opacity/color transitions.
- Spacious centered layouts.

Other pages should avoid copying:

- The four-video switcher unless the page is also an immersive media page.
- The fullscreen no-scroll constraint when the page needs content depth.
- The homepage PNG overlay unless the same cinematic scene is required.

## 14. Implementation Notes

- Use React, Tailwind CSS, and Lucide React icons.
- Homepage implementation can live in a single `App.tsx` component with shared
  CSS in `index.css`.
- Keep video arrays and labels as structured data instead of duplicating markup.
- Prefer Tailwind utilities for layout and state classes.
- Keep complex reusable visual effects, such as `.liquid-glass` and
  `.train-bob`, in global CSS.

## 15. Page QA Checklist

Before shipping a Lumora page:

- Typography uses Instrument Serif only for brand/display moments.
- Body, buttons, labels, and stats use `system-ui, sans-serif`.
- Main controls use pill radius where appropriate.
- Glass effects are subtle and readable over media.
- Text remains readable on every active video/background.
- Mobile navigation is reachable and animated cleanly.
- Buttons have stable dimensions and do not shift layout on hover.
- No text overlaps at mobile or desktop widths.
- Motion feels slow and calm, not jumpy.
- The page still works while videos or images are loading.
