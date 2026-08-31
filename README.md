# Vetalis - AI-Powered Healthcare Management System

A comprehensive healthcare management platform with AI-powered features, built with Next.js 14, TypeScript, and modern web technologies.

![Vetalis Healthcare Management System](image.png)

## Features

### Landing Page
- 🎨 Modern, clean medical UI design
- 📱 Fully responsive (mobile-first)
- ⚡ Optimized performance with Next.js Image
- 🎯 High-conversion landing page
- 🔒 Security-focused messaging
- 🏥 Doctor-first design approach

### Dashboard Features
- 👥 **Patient Management** - Complete patient records and history
- 💊 **AI Prescriptions** - AI-assisted prescription generation with Gemini
- 📄 **Report Analyzer** - AI-powered medical report analysis
- 🤖 **Medical Chatbot** - Safe, medical-only AI assistant
- 📊 **Vitals Tracking** - Real-time vital signs monitoring and visualization
- 🔐 **Role-Based Access** - Admin, Doctor, and Patient roles with granular permissions

## Tech Stack

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Animations:** Framer Motion
- **Forms:** React Hook Form + Zod validation
- **Fonts:** Inter (Google Fonts)

### Backend & Infrastructure
- **Authentication:** Supabase Auth (Email & Google OAuth)
- **Database:** Supabase PostgreSQL
- **File Storage:** Supabase Storage (medical reports & documents)
- **AI Model:** Google Gemini AI

### Deployment
- **Platform:** Vercel
- **Backend Infrastructure:** Supabase Ecosystem

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, or pnpm

### Installation

1. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

2. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Documentation

All detailed documentation files are located in the `/docs` folder:

- **Setup Guides**: See `/docs/NEON_AUTH_SETUP.md`, `/docs/GOOGLE_OAUTH_SETUP.md`
- **Implementation Guides**: See `/docs/DASHBOARD_IMPLEMENTATION.md`
- **Feature Documentation**: See `/docs/NOTIFICATIONS_SETUP.md`, `/docs/ROLE_BASED_ACCOUNT_CREATION.md`
- **Product Requirements**: See `/docs/prd.md`
- **Migration Guides**: See `/docs/MIGRATION_TO_NEON_AUTH.md`

For a complete list, see `/docs/README.md`.

## Project Structure

```
├── app/
│   ├── layout.tsx                    # Root layout with metadata
│   ├── page.tsx                      # Landing page
│   ├── globals.css                   # Global styles
│   ├── (auth)/
│   │   ├── login/
│   │   └── signup/
│   ├── dashboard/
│   │   ├── layout.tsx                # Dashboard layout with sidebar
│   │   ├── page.tsx                  # Dashboard home
│   │   ├── patients/
│   │   │   ├── page.tsx              # Patient list
│   │   │   └── [id]/
│   │   │       └── page.tsx          # Patient details
│   │   ├── prescriptions/
│   │   │   ├── page.tsx              # Prescription list
│   │   │   └── new/
│   │   │       └── page.tsx          # Create prescription
│   │   ├── reports/
│   │   │   ├── page.tsx              # Report list
│   │   │   └── [id]/
│   │   │       └── page.tsx          # Report analysis
│   │   ├── chatbot/
│   │   │   └── page.tsx              # Chatbot interface
│   │   ├── vitals/
│   │   │   └── page.tsx              # Vitals tracking
│   │   └── admin/
│   │       └── page.tsx              # Admin dashboard
│   └── api/
│       ├── auth/
│       │   └── [...nextauth]/
│       │       └── route.ts          # NextAuth handler
│       ├── patients/
│       │   └── route.ts              # Patient API
│       ├── prescriptions/
│       │   └── route.ts              # Prescription API
│       ├── reports/
│       │   ├── upload/
│       │   │   └── route.ts          # Upload to Cloudinary
│       │   ├── analyze/
│       │   │   └── route.ts          # AI analysis
│       │   └── [id]/
│       │       └── download/
│       │           └── route.ts      # Signed download URL
│       ├── chatbot/
│       │   └── route.ts              # Chatbot API
│       └── vitals/
│           └── route.ts              # Vitals API
├── components/
│   ├── landing/                      # Landing page components
│   │   ├── Navigation.tsx
│   │   ├── Hero.tsx
│   │   ├── Stats.tsx
│   │   ├── Services.tsx
│   │   ├── FeatureAbout.tsx
│   │   ├── Specialists.tsx
│   │   ├── CTA.tsx
│   │   └── Footer.tsx
│   ├── dashboard/                    # Dashboard components
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   ├── PatientList.tsx
│   │   ├── PrescriptionForm.tsx
│   │   ├── ReportUpload.tsx
│   │   ├── ChatbotInterface.tsx
│   │   └── VitalsChart.tsx
│   └── ui/                           # Reusable UI components
│       ├── Button.tsx
│       ├── Card.tsx
│       └── Input.tsx
├── lib/
│   ├── auth.ts                       # NextAuth configuration
│   ├── db.ts                         # Database connection
│   ├── redis.ts                      # Redis client
│   ├── cloudinary.ts                 # Cloudinary integration
│   ├── ai/
│   │   ├── gemini.ts                 # Gemini AI integration
│   │   └── prompts.ts                # AI prompts
│   └── utils.ts                      # Utility functions
├── middleware.ts                     # Route protection
├── prd.md                            # Product Requirements Document
└── package.json
```

## Sections

### Landing Page
1. **Navigation** - Sticky header with logo and menu
2. **Hero** - Main value proposition with hero text
3. **Stats** - Key metrics and statistics
4. **Services** - Core modules and features
5. **Feature About** - Technology deep dive
6. **Specialists** - Team/experts showcase
7. **CTA** - Final conversion section
8. **Footer** - Links, newsletter, and legal

### Dashboard Features
1. **Patient Management** - CRUD operations, medical history, search
2. **AI Prescriptions** - Manual and AI-assisted prescription generation
3. **Report Analyzer** - Upload and AI-analyze medical reports
4. **Medical Chatbot** - Safe AI assistant for medical queries
5. **Vitals Tracking** - Record and visualize patient vital signs
6. **Admin Panel** - User management, analytics, system settings

## Authentication & Authorization

### User Roles
- **Admin** - Full system access, user management, analytics
- **Doctor** - Patient management, prescriptions, reports, chatbot
- **Patient** - View own records, vitals, reports, limited chatbot access

### Authentication Flow
1. User signs up with email/password or Google OAuth via Supabase Auth
2. Email verification & session managed natively by Supabase (`@supabase/ssr`)
3. Role assignment stored in `public.users` table
4. Role-based route protection via Next.js middleware

## Environment Variables

Copy the provided `.env.example` to `.env.local` and configure your credentials:

```bash
cp .env.example .env.local
```

Required environment variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL="https://your-project-id.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="your-supabase-publishable-key"

# Storage Configuration (Optional)
NEXT_PUBLIC_SUPABASE_STORAGE_URL="https://your-project-id.storage.supabase.co/storage/v1/s3"
SUPABASE_STORAGE_REGION="ap-northeast-1"

# Google OAuth Credentials
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
NEXT_PUBLIC_GOOGLE_CLIENT_ID="your-google-client-id"

# AI Provider Configuration (Google Gemini / OpenAI / OpenCode Zen)
AI_BASE_URL="https://generativelanguage.googleapis.com/v1beta"
AI_API_KEY="your-ai-api-key"
AI_MODEL_NAME="gemini-1.5-flash"
GEMINI_API_KEY="your-gemini-api-key"

# OCR Configuration (Optional for medical report extraction)
OCR_SPACE_API_KEY="helloworld"
```

## Database & Storage Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the migration SQL in your Supabase SQL Editor:
   - File: `supabase/migrations/20260812000000_init_schema.sql`
   - This sets up all tables (`users`, `patients`, `doctors`, `prescriptions`, `vitals`, `medical_reports`, `notifications`), triggers, and the `medical-reports` storage bucket.
3. Configure Google OAuth in the Supabase Dashboard under Authentication > Providers (optional for social login).

## AI Integration Setup

1. Get an API key from [Google AI Studio](https://makersuite.google.com/app/apikey) or your preferred OpenAI-compatible provider
2. Set `AI_API_KEY` (and optionally `AI_BASE_URL` / `AI_MODEL_NAME`) in `.env.local`
3. Test features using:
```bash
node scripts/test-all-features.mjs
```

## Build for Production

```bash
npm run build
npm start
```

## Deployment

### Vercel Deployment

1. Push code to GitHub
2. Import project to Vercel
3. Add environment variables
4. Deploy

### Production Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `AI_API_KEY`
- `AI_BASE_URL` (optional)
- `AI_MODEL_NAME` (optional)
- `GOOGLE_CLIENT_ID` (optional)
- `GOOGLE_CLIENT_SECRET` (optional)

## API Documentation

### Authentication Endpoints
- Sign-in / Sign-up handled at `/auth/sign-in` and `/auth/sign-up`
- Account management at `/account/*` routes
- User synchronization at `/api/auth/sync-user`

### Patient Endpoints
- `GET /api/patients` - List patients (with filters)
- `POST /api/patients` - Create patient
- `GET /api/patients/[id]` - Get patient details
- `PUT /api/patients/[id]` - Update patient

### Prescription Endpoints
- `GET /api/prescriptions` - List prescriptions
- `POST /api/prescriptions` - Create prescription
- `POST /api/prescriptions/generate` - Generate AI prescriptions

### Report Endpoints
- `GET /api/reports/list` - List reports
- `POST /api/reports/upload` - Upload report to Supabase Storage
- `GET /api/reports/[id]/download` - Get signed download URL

### Chatbot Endpoints
- `POST /api/chatbot` - Send message with medical guardrails

## Security Features

- ✅ Role-based access control (RBAC: Admin, Doctor, Patient)
- ✅ Secure session handling via `@supabase/ssr` cookies
- ✅ Row Level Security (RLS) policies on database tables
- ✅ Input validation and error sanitization
- ✅ Medical safety disclaimers & guardrails on AI generation
- ✅ Secure file storage with Supabase Storage signed URLs
- ✅ Private report access with expiration tokens

## License

MIT

