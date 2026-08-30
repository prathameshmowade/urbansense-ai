---
name: UrbanSense AI
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#45464d'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#9d4300'
  on-secondary: '#ffffff'
  secondary-container: '#fd761a'
  on-secondary-container: '#5c2400'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#002113'
  on-tertiary-container: '#009668'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#ffdbca'
  secondary-fixed-dim: '#ffb690'
  on-secondary-fixed: '#341100'
  on-secondary-fixed-variant: '#783200'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  data-metric:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  container-margin: 24px
  gutter: 16px
  sidebar-width: 260px
  card-padding: 20px
---

## Brand & Style
The design system is engineered for high-stakes urban intelligence, prioritizing clarity, authority, and rapid cognitive processing. The personality is "Data-First Professional"—it remains invisible to allow complex geospatial data to take center stage. 

The visual style is **Corporate / Modern** with a lean toward **Minimalism**. It utilizes a systematic "white-label" aesthetic characterized by expansive light-gray canvas areas, crisp 1px borders, and high-contrast typography. This ensures the UI feels like a precision instrument rather than a consumer app, instilling trust in municipal stakeholders and transit operators.

## Colors
This design system utilizes a high-utility palette designed for an enterprise dashboard environment. 

- **Primary (Deep Transit Blue):** Used for navigation, primary actions, and authoritative headers. It provides a stable foundation for the data layers.
- **Secondary (Vibrant Orange):** Reserved strictly for critical alerts and urgent system notifications to ensure immediate visual redirection.
- **Success (Emerald Green):** Indicates optimal transit flow, active hardware status, and positive growth metrics.
- **Warning (Amber):** Used for moderate congestion or hardware maintenance flags.
- **Neutral:** A range of Slate grays is used for secondary text and structural borders to prevent visual fatigue during long monitoring sessions.

## Typography
The system relies on **Inter** for its neutral, highly legible grotesque qualities, ensuring that dense data tables and labels remain readable at small sizes. For specific technical data points, such as hardware IDs or timestamps, **JetBrains Mono** is introduced to provide a distinct "technical" texture and improve character recognition.

Large display sizes (32px+) should be used sparingly for KPI cards. On mobile devices, `display-lg` should scale down to 28px to maintain layout integrity.

## Layout & Spacing
The layout follows a **Fixed-Fluid Hybrid** model. The primary navigation is a fixed-width left sidebar (260px), while the main content area utilizes a fluid 12-column grid.

- **Desktop:** 12 columns, 24px margins, 16px gutters.
- **Tablet:** 8 columns, 16px margins, 16px gutters.
- **Mobile:** 4 columns, 16px margins, 12px gutters.

The spacing rhythm is strictly based on a **4px baseline grid**. Components like KPI cards use a consistent 20px (base * 5) internal padding to maintain a spacious, professional feel even when data density is high.

## Elevation & Depth
This design system avoids heavy drop shadows in favor of **Tonal Layers** and **Low-Contrast Outlines**. 

- **Level 0 (Canvas):** Background color (`#F8FAFC`).
- **Level 1 (Cards/Sidebar):** White surface (`#FFFFFF`) with a 1px solid border (`#E2E8F0`).
- **Level 2 (Overlays/Popovers):** White surface with a subtle, highly diffused ambient shadow (0px 4px 20px rgba(0,0,0,0.05)) to indicate depth without appearing "heavy."

Map overlays use a slight backdrop-blur (8px) to maintain legibility against the complex, high-motion background of a live map.

## Shapes
The shape language is **Soft** and disciplined. A 4px (`0.25rem`) border radius is the standard for almost all interactive elements, providing a modern touch while maintaining the seriousness of an enterprise tool.

- **Standard Elements:** 4px radius (Buttons, Inputs, Checkboxes).
- **Cards/Modules:** 8px radius (`rounded-lg`) to define major content areas.
- **Badges/Chips:** Fully rounded (pill-shaped) to distinguish them from interactive buttons.

## Components

### Status Badges
Badges use a semi-transparent background of their respective status color (10% opacity) with a solid 1px border of the same color at 30% opacity. Text must be the full-saturation status color for WCAG 2.1 AA compliance.
- **Critical:** Secondary Color (Orange)
- **Major:** Warning Color (Amber)
- **Info:** Neutral Color (Slate)

### Dashboard KPI Cards
Cards feature a `label-md` title at the top, a `data-metric` value in the center, and a small trend indicator at the bottom. Backgrounds are solid white with a 1px `#E2E8F0` border.

### Map UI Overlays
Map controls (Zoom, Layer Toggle) are vertically stacked 32x32px buttons. The search bar is a floating element at the top left with a 40px height and a `rounded-lg` corner radius.

### Input Fields & Buttons
Inputs use a white background and 1px `#CBD5E1` border. On focus, they transition to a 1px `Primary Color` border with a subtle 2px outer glow. Primary buttons use the `Primary Color` background with white `Inter Bold` text.

### Navigation Sidebar
The sidebar uses a slightly darker tint of the background or the `Primary Color` if high contrast is desired. Menu items should have an 8px horizontal padding and use `body-md` typography.