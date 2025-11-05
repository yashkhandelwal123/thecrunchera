# The Crunch eraBites - D2C Healthy Kids Food eCommerce Platform

## Overview

The Crunch eraBites is a direct-to-consumer eCommerce platform specializing in healthy, wholesome food products for children and families. The platform features a vibrant, playful-yet-premium design inspired by The Crunch era, targeting health-conscious parents while maintaining kid-friendly appeal. The application offers product browsing, shopping cart functionality, newsletter subscriptions, and contact forms.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool

**Routing**: Wouter for client-side routing with the following page structure:
- HomePage: Hero section, featured products, testimonials, trust badges
- ProductsPage: Full product catalog with category filtering
- AboutPage: Company story and mission
- ContactPage: Contact form for customer inquiries
- CartPage: Shopping cart management

**State Management**:
- React Query (@tanstack/react-query) for server state and API data fetching
- React Context API for shopping cart state (CartContext)
- Local storage persistence for cart data

**UI Component Library**: 
- Shadcn/ui components built on Radix UI primitives
- Custom themed with Tailwind CSS
- Design system follows "new-york" style variant
- Framer Motion for animations and transitions

**Styling Approach**:
- Tailwind CSS with custom theme extending base configuration
- CSS custom properties for theming (HSL color format)
- Design inspired by The Crunch era with vibrant warmth, rounded corners, and premium clarity
- Google Fonts: Quicksand (headings), Inter (body), Fredoka (accents)

### Backend Architecture

**Server Framework**: Express.js running on Node.js

**API Design**: RESTful API with the following endpoints:
- GET `/api/products` - Fetch all products
- GET `/api/products/:id` - Fetch single product by ID
- GET `/api/products/category/:category` - Fetch products by category
- POST `/api/newsletter` - Newsletter subscription
- POST `/api/contact` - Contact form submission

**Data Storage**: 
- Currently using in-memory storage (MemStorage class) with seed data
- Configured for PostgreSQL via Drizzle ORM (schema defined, ready for database connection)
- Database schema includes: products, newsletters, contacts tables

**Validation**: Zod schemas derived from Drizzle schemas for request validation

**Development Setup**: 
- Vite middleware mode for HMR in development
- Express serves built static files in production
- Separate client and server build processes

### Data Schema

**Products Table**:
- id (UUID primary key)
- name, description (text)
- price (decimal 10,2)
- category (text: Sauces, Snacks, Pasta, Drinks)
- image (text URL)
- badge (optional: "New", "Best Seller", "Organic")
- featured (integer flag: 1 or 0)

**Newsletters Table**:
- id (UUID primary key)
- email (unique text)

**Contacts Table**:
- id (UUID primary key)
- name, email, subject, message (text)

### Design System

**Color Theming**: HSL-based color system with CSS custom properties for light/dark mode support

**Typography Hierarchy**:
- Headings: text-5xl to text-6xl with Quicksand font
- Section headers: text-3xl to text-4xl
- Product titles: text-xl
- Body: text-base with Inter font

**Component Patterns**:
- Elevation system with hover/active states (hover-elevate, active-elevate-2)
- Rounded border radius (.5625rem default)
- Consistent spacing using Tailwind units (4, 6, 8, 12, 16, 20, 24)

## External Dependencies

**Primary Dependencies**:
- @neondatabase/serverless: PostgreSQL database driver for serverless environments
- drizzle-orm: TypeScript ORM for database operations
- drizzle-kit: Database migration and schema management
- @tanstack/react-query: Asynchronous state management
- @radix-ui/*: Accessible UI component primitives
- framer-motion: Animation library
- react-hook-form: Form state management
- zod: Schema validation
- wouter: Lightweight client-side routing

**Build Tools**:
- Vite: Frontend build tool and dev server
- tsx: TypeScript execution for server
- esbuild: Backend bundling
- Tailwind CSS: Utility-first CSS framework
- PostCSS with Autoprefixer

**Development Tools**:
- @replit/vite-plugin-runtime-error-modal: Development error overlay
- @replit/vite-plugin-cartographer: Replit integration
- @replit/vite-plugin-dev-banner: Development banner

**Database**:
- PostgreSQL (via Neon serverless driver)
- Drizzle ORM with PostgreSQL dialect
- Connection via DATABASE_URL environment variable