# Vetalis - HMS


A production-grade healthcare management platform featuring strict Role-Based Access Control (RBAC), private medical document storage, and clinical AI assistants. Built with **Next.js 14 (App Router)**, **TypeScript**, **Supabase (@supabase/ssr)**, and **Google Gemini AI**.

![Vetalis Healthcare Management System](image.png)

---

## Recent Project Updates & Enhancements

### 1. Role-Based Access Control (RBAC) & Dedicated Portals
- **Three Dedicated Portals**: Distinct dashboards and layout experiences for `/admin`, `/doctor`, and `/patient`.
- **Middleware Route Guards**: Strict server-side route interception in `middleware.ts` preventing privilege escalation and cross-role access.
- **Postgres Row Level Security (RLS)**: Database-level security functions (`is_admin`, `is_doctor`, `is_patient`, `is_doctor_assigned`) enforcing that users can only read/write authorized patient rows and medical records.

### 2. Complete Account Lifecycle & Onboarding Subsystem
- **Admin User Provisioning**: System administrators can provision new Doctor and Patient accounts via the Admin Portal (`/admin`) or API (`/api/users/create`).
- **Pre-authorized Roles**: Pre-authorized email invites stored in `preauthorized_roles` to guarantee intended roles upon signup or invitation claim.
- **Invitation & Password Setup**: Dispatches invitation tokens via Supabase Auth Admin. New users arrive at `/auth/set-password` to establish secure credentials.
- **Self-Service Password Recovery**: End-to-end password recovery flow with `/auth/forgot-password`, Supabase OTP/token exchange in `/auth/confirm`, and `/auth/reset-password`.
- **Account Settings & Security**: In-app profile inspection and password change module at `/account`.
- **Lifecycle Status Control**: Active, Invited, Deactivated, and Suspended account states with immediate middleware enforcement.

### 3. Doctor-Patient Clinical Assignment Subsystem
- **Relational Assignment Model**: Supported by `doctor_patient_assignments` table with unique pairings and assignment timestamps.
- **Strict Clinical Boundaries**: Doctors have access exclusively to patients assigned to them, while administrators retain facility-wide oversight.
- **Real-Time Assignment UI**: Assign and unassign doctors directly from the patient management and admin interfaces.

### 4. Zero Hardcoded Credentials & Secure Configuration
- **Full Credential Sanitization**: Audited and purged all hardcoded passwords, test credentials, and static endpoints from the codebase.
- **Dynamic Application Routing**: Dynamic URL resolution prioritizing `NEXT_PUBLIC_APP_URL` and `request.nextUrl.origin` for auth callbacks and invitation redirects.
- **Configurable External APIs**: Configurable OCR endpoints and API keys with graceful degradation if optional keys are omitted.
- **Hardened Git Safety**: Extended `.gitignore` to prevent tracking of test scripts, credentials, secrets, and environment files.

### 5. Private Supabase Storage & Signed URLs
- **Private Storage Bucket**: Medical documents stored in a locked `medical-reports` Supabase Storage bucket.
- **Time-Limited Signed URLs**: Direct public bucket access is prohibited. File downloads route through `/api/reports/[id]/download`, verifying user authorization before generating short-lived signed URLs.

### 6. Universal Clinical AI with Strict Guardrails
- **Multi-Provider Support**: Compatible with Google Gemini API, OpenCode Zen, OpenAI, or any OpenAI-compatible proxy via `AI_BASE_URL`.
- **Clinical Pharmacy Prescriptions**: Suggests medication name, dosage, frequency, and rationale based on patient symptoms, diagnosis, and medical history.
- **Diagnostic Report Analyzer**: Parses structured clinical findings, abnormalities, and follow-up recommendations from lab results.
- **Medical Guardrails**: Real-time filtering declining non-medical queries with official healthcare disclaimers.

---

## Features

### Role-Based Portals

| Portal | Route | Key Capabilities |
| :--- | :--- | :--- |
| **Admin Portal** | `/admin` | System-wide statistics, user lifecycle management (create, invite, deactivate), doctor-patient assignments, and audit tracking. |
| **Doctor Portal** | `/doctor` | Assigned patient roster, clinical history, vital signs monitoring, AI-assisted prescription generation, and report analysis. |
| **Patient Portal** | `/patient` | Personal medical records, active prescriptions, lab report viewing, and interactive health assistant chatbot. |

### Core Modules
- 👥 **Patient Management** - Complete medical records, allergies, blood type, emergency contacts, and history.
- 💊 **AI Prescription Studio** - Medication suggestions with dosage and clinical rationale powered by Gemini.
- 📄 **Report Analyzer & OCR** - Document text extraction via OCR.space with automated AI diagnostic summarization.
- 🤖 **Medical AI Chatbot** - Specialized healthcare conversational agent with medical-only guardrails.
- 📊 **Vitals Tracking** - Blood pressure, heart rate, temperature, respiratory rate, and blood sugar charting with Recharts.
- 🔔 **Notification Center** - Real-time alerts for prescription updates, lab reports, and account notices.

---

## Tech Stack

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS + PostCSS
- **Component Primitives & Icons:** Lucide React, Framer Motion
- **Data Visualization:** Recharts
- **Forms & Validation:** React Hook Form + Zod
- **Notifications:** Sonner Toast Notifications

### Backend & Infrastructure
- **Authentication & SSR:** Supabase Auth via `@supabase/ssr` (HTTP-only cookie sessions)
- **Database:** Supabase PostgreSQL with Row Level Security (RLS)
- **Storage:** Supabase Storage (Private document buckets)
- **AI / LLM:** Google Gemini API (`@google/generative-ai`) & OpenAI-compatible endpoints
- **OCR:** OCR.space REST API

---

## Project Structure

```
├── app/
│   ├── layout.tsx                        # Root layout with fonts & providers
│   ├── page.tsx                          # Public medical landing page
│   ├── globals.css                       # Global Tailwind styling
│   ├── admin/                            # Dedicated Admin Portal
│   │   ├── layout.tsx
│   │   └── page.tsx                      # Admin overview & management tabs
│   ├── doctor/                           # Dedicated Doctor Portal
│   │   ├── layout.tsx
│   │   └── page.tsx                      # Doctor dashboard & assigned patients
│   ├── patient/                          # Dedicated Patient Portal
│   │   ├── layout.tsx
│   │   └── page.tsx                      # Patient personal health overview
│   ├── account/
│   │   └── [...pathname]/page.tsx        # Profile details & password change
│   ├── auth/
│   │   ├── [...pathname]/page.tsx        # Sign-in & Sign-up interface
│   │   ├── callback/route.ts             # Google OAuth & session exchange
│   │   ├── confirm/route.ts              # OTP, email confirmation & token router
│   │   ├── forgot-password/page.tsx      # Password reset request page
│   │   ├── reset-password/page.tsx       # Set new password recovery page
│   │   └── set-password/page.tsx         # First-time invite password setup
│   ├── dashboard/                        # Shared clinical sub-features
│   │   ├── chatbot/                      # Medical AI Chatbot interface
│   │   ├── patients/                     # Patient directory & detailed profiles
│   │   ├── prescriptions/                # Prescription list & AI generator
│   │   ├── reports/                      # Medical report list & upload form
│   │   └── vitals/                       # Vital signs telemetry & metrics
│   └── api/
│       ├── assignments/                  # Doctor-patient assignment CRUD
│       ├── auth/                         # User sync & signout handlers
│       ├── chatbot/                      # AI chatbot inference endpoint
│       ├── notifications/                # Real-time alert handlers
│       ├── patients/                     # Patient records CRUD
│       ├── prescriptions/                # Prescriptions CRUD & AI generator
│       ├── reports/                      # Document upload & signed download URLs
│       ├── stats/                        # Dashboard operational metrics
│       ├── users/                        # Administrative user provisioning & invites
│       └── vitals/                       # Patient vitals telemetry
├── components/
│   ├── landing/                          # Landing page visual components
│   └── dashboard/                        # Dashboard widgets, tables, modals & charts
├── lib/
│   ├── db.ts                             # Supabase client helper
│   ├── gemini.ts                         # Universal AI integration with guardrails
│   ├── ocr.ts                            # OCR text extraction service
│   ├── supabase-auth-server.ts           # Server-side user & profile verification
│   ├── supabase-auth.ts                  # Client-side Supabase auth helper
│   └── supabase-storage.ts               # Private storage upload & signed URL generator
├── middleware.ts                         # Session validation, status & RBAC route guards
├── supabase/
│   └── migrations/                       # Database schema & security migrations
├── .env.example                          # Canonical environment configuration template
└── README.md                             # Project documentation
```

---

## Getting Started

### Prerequisites
- Node.js 18.17+ or Node.js 20+
- npm, yarn, or pnpm
- A Supabase project ([supabase.com](https://supabase.com))

### 1. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/PratyushKumar43/Vetalis-Healthcare-Management-System.git
cd Vetalis-Healthcare-Management-System
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Fill in your environment credentials:
```env
# Application Base URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL="https://your-project-id.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="your-supabase-publishable-key"

# Supabase Service Role Key (Server-side administrative tasks only)
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"

# Google OAuth Credentials (Optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
NEXT_PUBLIC_GOOGLE_CLIENT_ID="your-google-client-id"

# AI Provider Configuration (Google Gemini / OpenAI / OpenCode Zen)
AI_BASE_URL="https://generativelanguage.googleapis.com/v1beta"
AI_API_KEY="your-ai-api-key"
AI_MODEL_NAME="gemini-1.5-flash"

# OCR Configuration (Optional for medical report text extraction)
OCR_SPACE_API_KEY="your-ocr-space-api-key"
OCR_SPACE_API_URL="https://api.ocr.space/parse/image"
```

### 3. Database Setup & Migrations
Run the SQL migration scripts located in `supabase/migrations/` sequentially in your Supabase SQL Editor:

1. `20260812000000_init_schema.sql` - Core tables (`users`, `patients`, `doctors`, `prescriptions`, `vitals`, `medical_reports`, `notifications`), triggers, and initial storage bucket.
2. `20261013010000_rbac_and_storage_security.sql` - RBAC security functions (`is_admin`, `is_doctor`, `is_patient`, `is_doctor_assigned`), private bucket policies, and `doctor_patient_assignments` table.
3. `20261013020000_fix_users_rls_recursion.sql` - High-performance non-recursive RLS policy optimization for `public.users`.
4. `20261014000000_account_lifecycle_and_invites.sql` - User status column (`invited`, `active`, `deactivated`, `suspended`), `preauthorized_roles` table, and invitation tracking columns.

### 4. Running the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Production Build & Deployment

### Build Application
Verify that TypeScript compilation and static page generation complete cleanly:
```bash
npm run build
npm start
```

### Deploying to Vercel
1. Push your repository to GitHub.
2. Import the project into Vercel.
3. Configure the environment variables from your `.env.local` in the Vercel Project Settings.
4. Set the Root Directory to `./` and deploy.

---

## Security Architecture

- **HTTP-Only Cookies**: Authentication sessions are stored in cryptographically signed, secure HTTP-only cookies managed via `@supabase/ssr`.
- **Row Level Security (RLS)**: Enforced directly at the PostgreSQL layer. Direct database queries cannot bypass role constraints even if an API route is compromised.
- **Signed Storage URLs**: Medical files are never exposed publicly. Access expires automatically through cryptographically signed URLs.
- **Input Validation**: Client and server schemas verified using Zod and TypeScript.
- **Medical Safety Boundaries**: The clinical assistant automatically detects non-medical questions and declines to answer, providing appropriate healthcare disclaimers.

---

## License

This project is licensed under the MIT License.
