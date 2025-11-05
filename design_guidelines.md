# Design Guidelines: Troovy-Inspired D2C eCommerce Website

## Design Approach
**Reference-Based**: Drawing inspiration from Troovy's vibrant, playful-yet-premium aesthetic targeting health-conscious parents. The design balances kid-friendly energy with parental trust and sophistication.

## Core Design Principles
- **Vibrant Warmth**: Energetic but trustworthy, appealing to both children and parents
- **Rounded Friendliness**: Soft, approachable UI with generous radius on all components
- **Premium Clarity**: Clean layouts with ample whitespace despite colorful elements
- **Trust-First**: Health credentials and transparency emphasized throughout

## Typography System

**Font Families** (Google Fonts):
- Headings: 'Quicksand' (700, 600) - playful yet clean
- Body: 'Inter' (400, 500, 600) - excellent readability
- Accents: 'Fredoka' (600) - for kid-friendly callouts

**Hierarchy**:
- Hero Headlines: text-5xl to text-6xl, font-bold
- Section Headers: text-3xl to text-4xl, font-semibold
- Product Titles: text-xl, font-semibold
- Body Text: text-base, font-normal
- Badges/Labels: text-sm, font-medium, uppercase tracking-wide

## Layout System
**Spacing Units**: Consistently use Tailwind units of 4, 6, 8, 12, 16, 20, 24 for margins and padding (e.g., p-8, mb-12, space-y-6)

**Grid Structure**:
- Container: max-w-7xl with px-6 on mobile, px-8 on desktop
- Product Grids: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 with gap-6
- Feature Sections: 2-column layouts on desktop (grid-cols-1 lg:grid-cols-2)

## Component Library

### Navigation
- **Sticky Header**: Backdrop blur with subtle shadow on scroll
- Logo left, main nav center, cart icon + CTA button right
- Rounded pill-style nav links with smooth hover transitions
- Mobile: Hamburger menu with slide-in full-screen overlay

### Hero Section (Homepage)
- **Large Hero Image**: Full-width lifestyle image of happy kids enjoying healthy snacks, natural lighting
- Height: 85vh on desktop, 70vh on mobile
- Overlay: Subtle gradient to ensure text readability
- Content positioning: Left-aligned or centered with max-w-2xl
- Hero CTA: Large rounded button with blurred background, prominent "Shop Now" text
- Trust badges row below hero: "100% Natural • No Preservatives • Kid-Approved"

### Product Cards
- Rounded-2xl cards with subtle shadow and hover lift effect
- Product image: Square aspect ratio, rounded-t-2xl
- Badge overlays: "New", "Best Seller", "Organic" in top-right corner
- Card padding: p-4 to p-6
- Add to Cart button: Full width, rounded-xl, bold color
- Price: Large text-xl font-semibold
- Quick view icon on hover (optional)

### Trust Indicators
- Icon + Text combinations displayed prominently
- Circular or rounded-square icon backgrounds
- Grid display: 3-4 columns on desktop, 2 columns on mobile
- Examples: Leaf icon for "100% Natural", Shield for "No Preservatives", Heart for "Kid-Approved"

### Testimonials Carousel
- Card-based testimonials with rounded-3xl backgrounds
- Parent photo (circular) + child age indicator
- 5-star rating display
- Navigation dots below, subtle arrow controls
- Auto-rotate with 5-second intervals

### Forms (Contact/Newsletter)
- Rounded-xl input fields with generous padding (p-4)
- Focus states: Ring-2 with primary color
- Submit buttons: Full-width on mobile, auto width on desktop
- Success states: Checkmark animation with confirmation message

### Footer
- Multi-column layout: Company info, Quick Links, Resources, Newsletter
- Social media icons: Rounded-full with hover color transitions
- Newsletter signup: Inline input + button combination
- Copyright and certifications row at bottom

## Images

**Hero Images Required**:
1. **Homepage Hero**: Wide lifestyle shot of diverse children (ages 4-10) enjoying colorful healthy snacks outdoors, bright natural lighting, joyful expressions, product packaging visible but not dominant (1920x1080 minimum)

**Product Images**:
2. **Product Cards**: Clean product shots on white/cream backgrounds, showing packaging clearly, consistent lighting and angles (800x800 minimum, square)

**About Us Page**:
3. **Founder Story**: Candid photo of founders (parents) with their children in kitchen or natural setting, warm authentic feel
4. **Ingredients Section**: Vibrant close-up shots of fresh fruits, vegetables, whole grains - macro photography style

**Additional Supporting Images**:
5. **Health Benefits Icons Section**: Use illustrated icons (not photos) for nutritional benefits
6. **Testimonials**: Circular parent profile photos (400x400)

All images should convey warmth, authenticity, and healthfulness. Avoid overly staged or stock-photo aesthetics.

## Animations (Framer Motion - Subtle Usage)
- **Page Transitions**: Fade-in only, duration 0.3s
- **Product Cards**: Scale on hover (1.02), lift shadow effect
- **Hero Elements**: Stagger fade-in for headline → subtext → CTA (delays: 0.1s, 0.2s, 0.3s)
- **Scroll Reveals**: Fade-up for section headers only (not every element)
- **Cart Additions**: Success checkmark animation, scale pulse
- Avoid: Excessive parallax, continuous animations, complex scroll-triggered effects

## Page-Specific Guidelines

### Homepage
- Hero with large image + tagline + CTA (85vh)
- Featured products grid (8-12 products, 4 columns desktop)
- Health benefits icon section (4-6 benefits, 3-4 columns)
- Brand values section (2-column with image)
- Testimonials carousel (3-5 testimonials visible)
- Newsletter CTA section
- Total sections: 7-8

### Products Page
- Filter sidebar: Category checkboxes, rounded chips for active filters
- Product grid: Responsive 1-2-3-4 column layout
- Quick filters bar above grid: "All", "Sauces", "Snacks", "Pasta", etc.
- Empty states: Friendly illustration + helpful text

### About Us
- Founder story section: 2-column (image left, story right)
- Mission statement: Centered, max-w-3xl, large text
- Values grid: 3-column icon cards
- Sustainability section: Timeline or step-by-step visual
- Total sections: 5-6

### Contact Page
- 2-column layout: Contact form left, info/map placeholder right
- Form fields: Name, Email, Subject, Message
- Alternative contact methods displayed prominently
- Expected response time mentioned

## Accessibility
- Focus indicators: Ring-2 visible on all interactive elements
- Color contrast: WCAG AA compliant for all text
- Alt text: Descriptive for all product and hero images
- Form labels: Always visible, not placeholder-only
- Keyboard navigation: Logical tab order throughout

This comprehensive design creates a vibrant, trustworthy eCommerce experience that appeals to both parents and children while maintaining premium quality and usability.