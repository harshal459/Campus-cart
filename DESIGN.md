---
name: Campus Cart
colors:
  surface: '#FFFFFF'
  surface-dim: '#FFF5F5'
  surface-bright: '#FFFFFF'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#FFF5F5'
  surface-container: '#FFF0F0'
  surface-container-high: '#FFE5E5'
  surface-container-highest: '#FFDADA'
  on-surface: '#111827'
  on-surface-variant: '#64748B'
  inverse-surface: '#111827'
  inverse-on-surface: '#FFFFFF'
  outline: '#64748B'
  outline-variant: '#E5E7EB'
  surface-tint: '#E31E24'
  primary: '#C9161D'
  on-primary: '#ffffff'
  primary-container: '#E31E24'
  on-primary-container: '#7F1D1D'
  inverse-primary: '#FDA4AF'
  secondary: '#E31E24'
  on-secondary: '#ffffff'
  secondary-container: '#FFF5F5'
  on-secondary-container: '#B91C1C'
  tertiary: '#64748B'
  on-tertiary: '#ffffff'
  tertiary-container: '#FFF0F0'
  on-tertiary-container: '#64748B'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#FFE4E6'
  primary-fixed-dim: '#FDA4AF'
  on-primary-fixed: '#7F1D1D'
  on-primary-fixed-variant: '#B91C1C'
  secondary-fixed: '#FFF5F5'
  secondary-fixed-dim: '#FFE4E6'
  on-secondary-fixed: '#7F1D1D'
  on-secondary-fixed-variant: '#B91C1C'
  tertiary-fixed: '#FFF0F0'
  tertiary-fixed-dim: '#FFE5E5'
  on-tertiary-fixed: '#111827'
  on-tertiary-fixed-variant: '#64748B'
  background: '#FFFFFF'
  on-background: '#111827'
  surface-variant: '#FFE5E5'
typography:
  display:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  display-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  title-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.03em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.25rem
  gutter-mobile: 0.75rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system establishes an authentic, accessible, and grounded collegiate commerce experience. The target audience comprises university students, campus staff, and academic communities who demand speed, trust, and zero friction when buying, selling, or trading textbooks, dorm essentials, tech, and gear.

The visual direction merges **Clean Modernism** with **Academic Collegiate Energy**. Rather than feeling like a sterile corporate e-commerce platform or an ad-bloated local classifieds site, the interface evokes organized student life: crisp notebooks, warm light-red accents, natural daylight, and structured clarity. It communicates safety, community accountability, and modern digital utility through thoughtful white space, tactile rounded cards, disciplined type hierarchy, and soft ambient contrast.

## Colors

The color palette uses a clear red-and-white identity with a soft red canvas and calm neutral typography.

- **Primary (`#E31E24`)**: Bright red anchors primary actions, active states, brand highlights, prices, and important icons. The deeper red (`#C9161D`) is reserved for hover states.
- **White (`#FFFFFF`)**: Main canvas, product cards, form controls, and modal surfaces stay white for clarity.
- **Light Red (`#FFF5F5`)**: Selected categories, badges, and subtle section backgrounds use a soft red tint.
- **Typography & Borders (`#111827`, `#64748B`, `#E5E7EB`)**: Dark text and slate secondary text maintain legibility, while light gray borders give cards and controls clear structure.

## Typography

Plus Jakarta Sans is utilized across all typographic levels. Its contemporary geometric underpinnings combined with warm, wide apertures mirror classic scholarly sans-serifs while delivering optimal screen legibility across dense product grids, chat interfaces, and pricing badges.

- **Headlines & Display**: Strong, confident, and tightly tracked to maintain punchiness without consuming disproportionate vertical space.
- **Body Text**: Generous vertical line-height ensures ease of reading for extended condition notes, textbook edition descriptions, and seller bios.
- **Labels & Microcopy**: Formatted with slightly increased tracking (`0.02em` to `0.03em`) and medium/semibold weight for rapid visual filtering of item tags, condition chips, and timestamp statuses.

## Layout & Spacing

The layout is grounded in a flexible 12-column responsive grid (desktop) shifting to 6 columns (tablet) and 2 or 4 columns (mobile):

- **Desktop (1024px+)**: Max-width container set to `1280px` with `2rem` margins and `1.25rem` gutters. Listings are displayed in 3- or 4-column configurations to maintain structural rhythm without crowding photos.
- **Tablet (768px - 1023px)**: 6 columns with `1.5rem` margins and `1rem` gutters. Product grids adapt to 2 or 3 columns.
- **Mobile (< 768px)**: 2-column asymmetric browsing grid or 1-column card stack with `1rem` margins and `0.75rem` gutters. Sticky bottom actions (such as "Message Seller" or "Make Offer") maintain safe-area padding.

All layout rhythms and internal container paddings adhere strictly to the 4px/8px modular scale defined by the spacing tokens.

## Elevation & Depth

This system utilizes gentle ambient shadows mixed with warm, low-contrast structural outlines rather than heavy skeuomorphic drops.

- **Base Surface (`Level 0`)**: `#FFFFFF` ground with zero shadow.
- **Cards & Containers (`Level 1`)**: `#FFFFFF` background coupled with a 1px border of `#E5E7EB` and an ultra-soft neutral shadow.
- **Interactive Hover & Flyouts (`Level 2`)**: Used when a student hovers over an item card or opens an action popover with a subtle neutral shadow. The card subtly translates upward by 2px.
- **Modals, Drawers & Bottom Sheets (`Level 3`)**: Overlays for fast negotiations, checkout, or photo inspection with a soft neutral shadow, complemented by a `rgba(17, 24, 39, 0.55)` backdrop.

## Shapes

The interface embraces friendly, approachable geometry. Standard interactive elements employ `0.5rem` (`8px`) corner radius, creating clear click boundaries. 

Cards and modal containers adopt generous `rounded-xl` (`1.5rem` / `24px`) radii to instill an informal, approachable feel suitable for student exchanges. Pill-shaped geometry (`9999px`) is reserved exclusively for status badges, filter chips, category shortcuts, and floating action prompts.

## Components

### Buttons
- **Primary**: Solid `#E31E24` fill with `#FFFFFF` text. Height of 44px (touch target compliant), rounded corners, and bold label. Hover transforms to `#C9161D`.
- **Secondary**: `#FFF5F5` background with red text; the background deepens subtly on hover.
- **Outline**: 1px border in `#E5E7EB` with dark text `#111827`, white background, transitioning to `#FFF5F5` on hover.

### Chips & Category Pills
- Filter and taxonomy chips are fully pill-shaped (`rounded-full`) with a height of 36px.
- **Inactive**: `#FFFFFF` ground, `#E5E7EB` 1px border, `#64748B` text.
- **Active**: `#FFF5F5` ground with `#E31E24` text.
- **Quick Tags / Condition Tags**: Compact pill with `#FFF5F5` background and red label (e.g., "Like New", "BIO 101", "Dorm Pickup").

### Marketplace Product Cards
- Contained within `rounded-xl` borders featuring `#FFFFFF` background, 1px `#E5E7EB` stroke, and Level 1 elevation.
- Product photography maintains a consistent 4:3 or 1:1 aspect ratio with `rounded-t-xl` corners.
- Internal body includes: price rendered in red (`#E31E24`), title in dark text (`#111827`), and a building or dorm meetup indicator with a micro pin icon.

### Input Fields & Search Bars
- Global search bar is large (48px height) with rounded corners, a subtle `#E5E7EB` border, white fill, and a red focus ring.
- Form inputs feature clear floating labels, assistive hint text in `body-sm`, and explicit error states with gentle red tinting (`#DC2626`).

### Checkboxes & Radio Buttons
- 20px controls with a 2px stroke in `#E5E7EB`. When checked, the fill transitions smoothly to `#E31E24` displaying a crisp white indicator. Radio buttons utilize an internal circular dot with 4px white inset spacing.

### Student Verification Badge
- Custom micro-component displaying `.edu Verified` with an academic cap glyph. Features an `#FFF5F5` background, red text, a 1px `#E5E7EB` border, and pill geometry to reinforce peer safety throughout seller bios.