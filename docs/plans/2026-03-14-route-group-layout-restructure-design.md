# Route Group Layout Restructure

**Date:** 2026-03-14
**Status:** Approved
**Approach:** C — Split guards from shell

## Problem

Every page (~35+) individually imports and wraps content in `<AppLayout>`, duplicating session-loading logic and preventing Next.js from optimizing layout rendering via nested layouts.

## Solution

Use Next.js route groups `(auth)`, `(default)`, and a nested `(app)` group to create a three-tier layout hierarchy that separates auth pages, session loading, and the app shell.

## File Structure

```
app/
├── layout.tsx                          # Root: HTML, body, fonts, dark mode (unchanged)
├── globals.css                         # (unchanged)
│
├── (auth)/
│   ├── layout.tsx                      # Minimal: renders children
│   ├── login/page.tsx
│   └── onboarding/
│       ├── layout.tsx
│       └── page.tsx
│
├── (default)/
│   ├── layout.tsx                      # Session loader + Toaster
│   ├── sites/
│   │   └── page.tsx                    # Post-auth, pre-instance (no sidebar)
│   └── (app)/
│       ├── layout.tsx                  # Instance guard + AppLayout shell
│       ├── page.tsx                    # Dashboard (URL: /)
│       ├── firewall/...
│       ├── network/...
│       ├── policies/...
│       ├── routing/...
│       ├── system/...
│       ├── vpn/...
│       ├── load-balancing/...
│       ├── monitoring/...
│       └── settings/...
│
└── api/                                # API routes (unchanged)
```

## Layout Chains

| URL | Layout chain |
|-----|-------------|
| `/login` | Root → `(auth)/layout` → page |
| `/onboarding` | Root → `(auth)/layout` → onboarding/layout → page |
| `/sites` | Root → `(default)/layout` → page |
| `/` (dashboard) | Root → `(default)/layout` → `(app)/layout` → page |
| `/firewall/policies` | Root → `(default)/layout` → `(app)/layout` → page |

## Layout Responsibilities

### `app/layout.tsx` (Root — unchanged)
- HTML, body, fonts, dark mode class

### `app/(auth)/layout.tsx` (Auth — new)
- Minimal wrapper, renders `{children}`
- No session loading, no sidebar, no guards

### `app/(default)/layout.tsx` (Session loader — new)
- Client component
- Calls `useSessionStore().loadSession()` on mount
- Shows loading spinner while session loads
- Renders `<Toaster />`
- Does NOT check for active instance
- Passes `{children}` after session loads

### `app/(default)/(app)/layout.tsx` (App shell — new)
- Client component
- Instance guard: reads `activeSession` from Zustand, redirects to `/sites` if null
- Renders `<AppLayout>{children}</AppLayout>` (simplified shell component)

## Component Changes

### `AppLayout` (simplified, kept in `components/layout/`)
- **Remove:** `useSessionStore`, `loadSession`, `useEffect` hooks, loading/redirect states, `<Toaster />`
- **Keep:** `<Sidebar />`, `<PowerActionBanner />`, `<UnsavedChangesBanner />`, flex layout wrapper
- Becomes a pure visual shell with no session logic

### All ~35 feature pages
- Remove `import { AppLayout }` and all `<AppLayout>` wrappers
- Remove redundant session-loading guards (loading spinners, `loadSession()` calls, active-session checks)
- Pages return content directly

### `sites/page.tsx`
- Moves from `app/sites/` to `app/(default)/sites/`
- No changes to internal logic

## Data Flow

```
User navigates to any (default) route
  → (default)/layout.tsx mounts
  → calls loadSession()
  → shows spinner while loading
  → session loaded → renders children
    → /sites: page renders directly
    → any (app) route:
      → (app)/layout.tsx checks activeSession
      → No instance → redirect to /sites
      → Has instance → AppLayout shell → page content
```

## Edge Cases

1. **Direct navigation to app route with no instance** — `(app)/layout.tsx` redirects to `/sites`
2. **Instance disconnected mid-session** — Zustand update triggers re-render → redirect
3. **Session expired** — API calls fail with 401, pages handle as currently
4. **Back button from app to sites** — works via layout persistence

## What's NOT Changing

- API routes (`app/api/`)
- Zustand session store API
- Backend auth/session middleware
- `routing/static-failover/layout.tsx` (moves into `(app)` as-is)

## Testing

1. Structural: no page imports `AppLayout`
2. Route: verify each layout chain renders correctly
3. Guards: clear instance → confirm redirect from any `(app)` route
4. TypeScript: `npm run type-check:frontend` passes
5. Backend: `pytest` unchanged
