# Gemini Project Context: Monthly YouTube Growth

This document provides a comprehensive overview of the "Monthly YouTube Growth" project, intended as a context file for the Gemini AI assistant.

## 1. Project Overview

This is a **SaaS (Software as a Service) application** designed to provide YouTube creators with monthly growth plans and analytics for their channels. The application allows users to connect their YouTube account, import channel data, and (in future versions) receive AI-powered insights and content suggestions.

The project is a modern web application built with a Jamstack architecture.

**Core Technologies:**
*   **Framework:** Next.js 15+ (App Router)
*   **Language:** TypeScript
*   **Backend & Database:** Supabase (PostgreSQL, Auth, Storage)
*   **Styling:** Tailwind CSS v4
*   **UI Components:** Custom components using `lucide-react` for icons. The structure suggests a `shadcn/ui`-like approach.
*   **State Management:** TanStack Query (React Query) for managing server state and asynchronous operations.
*   **API Interaction:** Direct client-side calls to the YouTube Data API v3 using `googleapis` library.

**Architecture:**
*   The frontend is built with Next.js and React, using the App Router for file-based routing.
*   Authentication is handled by Supabase Auth, with both email/password and Google OAuth providers.
*   A Next.js middleware (`middleware.ts`) protects authenticated routes (like `/dashboard`).
*   User data and YouTube API tokens are stored in a `profiles` table in the Supabase PostgreSQL database.
*   The dashboard is primarily a client-side component that fetches data directly from Supabase and the YouTube API after the initial user authentication.

## 2. Database Schema and RLS Policies

The core user data is stored in the `public.profiles` table, which extends Supabase's built-in `auth.users` table.

### `public.profiles` Table Schema
```sql
id UUID PRIMARY KEY REFERENCES auth.users,
email TEXT UNIQUE,
youtube_access_token TEXT,
youtube_refresh_token TEXT,
youtube_channel_id TEXT,
youtube_token_expires_at TIMESTAMPTZ,
youtube_channel_title TEXT,
youtube_channel_thumbnail TEXT,
subscription_tier TEXT DEFAULT 'free',
created_at TIMESTAMPTZ DEFAULT NOW()
```

### Automatic Profile Creation (Trigger)
A PostgreSQL function and trigger are set up to automatically create a corresponding row in `public.profiles` whenever a new user signs up via Supabase Auth:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Row-Level Security (RLS) Policies
RLS is enabled on `public.profiles` for security. The following policies are crucial for the application's functionality:

*   **`ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;`** (Ensures RLS is active)
*   **`CREATE POLICY "Users can read their own profile." ON public.profiles FOR SELECT USING (auth.uid() = id);`** (Allows authenticated users to read their own profile data, e.g., in the dashboard)
*   **`CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);`** (Allows authenticated users to update their own profile data, essential for saving YouTube tokens after OAuth)

## 3. Building and Running

The project uses `npm` as its package manager. Key commands are defined in `package.json`.

*   **Install dependencies:**
    ```bash
    npm install
    ```

*   **Run the development server:**
    Starts the application on `http://localhost:3000`.
    ```bash
    npm run dev
    ```

*   **Create a production build:**
    ```bash
    npm run build
    ```

*   **Run the production server:**
    ```bash
    npm run start
    ```

*   **Run the linter:**
    ```bash
    npm run lint
    ```

### Environment Variables
The project requires a `.env.local` file with Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```
Additional variables for Google OAuth (e.g., `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`) and YouTube API keys are also necessary.

## 4. Development Conventions

*   **Routing:** The project uses the Next.js App Router. Route groups like `(auth)` are used for organization.
*   **Authentication:**
    *   Session management is handled by `@supabase/ssr`.
    *   The `middleware.ts` file is the central point for protecting routes and managing session cookies.
    *   The `/app/auth/callback/route.ts` handles the server-side OAuth callback from Supabase (e.g., for Google sign-in).
    *   The YouTube OAuth flow is managed by `/app/api/youtube/callback/route.ts`, which exchanges authorization codes for tokens and saves them to the user's profile in the database.
*   **Data Fetching:**
    *   Client components (`'use client'`) are used extensively for interactive pages.
    *   The `lib/supabase/client.ts` and `lib/supabase/server.ts` files provide utility functions for creating Supabase clients in different contexts.
    *   TanStack Query should be used for caching server state and avoiding redundant data fetches.
*   **Styling:**
    *   Styling is done with Tailwind CSS.
    *   Utility functions like `clsx` and `tailwind-merge` are available for constructing conditional class names.
*   **Code Quality:** TypeScript is used for type safety, and ESLint is configured for code linting.
