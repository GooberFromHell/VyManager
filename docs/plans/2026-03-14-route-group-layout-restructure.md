# Route Group Layout Restructure — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:executing-plans to implement this plan task-by-task.

**Goal:** Restructure the Next.js app to use route groups `(auth)`, `(default)`, and `(app)` with nested layouts, eliminating per-page `<AppLayout>` wrapping.

**Architecture:** Three-tier layout hierarchy — root (HTML shell), `(default)` (session loading + Toaster), `(app)` (instance guard + sidebar/banners). Auth pages get a minimal layout with no session logic. AppLayout becomes a pure visual shell component.

**Tech Stack:** Next.js 16 App Router route groups, Zustand session store, existing AppLayout/Sidebar/Banner components.

**Design doc:** `docs/plans/2026-03-14-route-group-layout-restructure-design.md`

---

### Task 0: Create the three new layout files

**Files:**
- Create: `frontend/src/app/(auth)/layout.tsx`
- Create: `frontend/src/app/(default)/layout.tsx`
- Create: `frontend/src/app/(default)/(app)/layout.tsx`

**Step 1: Create `(auth)/layout.tsx`**

Minimal wrapper — no session logic, no sidebar:

```tsx
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
```

**Step 2: Create `(default)/layout.tsx`**

Client component that loads the VyOS session and provides Toaster:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useSessionStore } from "@/store/session-store";
import { Toaster } from "@/components/ui/toaster";
import { Loader2 } from "lucide-react";

export default function DefaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loadSession } = useSessionStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      await loadSession();
      setIsLoading(false);
    };
    load();
  }, [loadSession]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
      <Toaster />
    </>
  );
}
```

**Step 3: Create `(default)/(app)/layout.tsx`**

Instance guard + AppLayout shell:

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/store/session-store";
import { AppLayout } from "@/components/layout/AppLayout";
import { Loader2 } from "lucide-react";

export default function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { activeSession } = useSessionStore();

  useEffect(() => {
    if (!activeSession) {
      router.push("/sites");
    }
  }, [activeSession, router]);

  if (!activeSession) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Redirecting to site manager...</p>
        </div>
      </div>
    );
  }

  return <AppLayout>{children}</AppLayout>;
}
```

**Step 4: Verify files exist**

Run: `ls frontend/src/app/\(auth\)/layout.tsx frontend/src/app/\(default\)/layout.tsx frontend/src/app/\(default\)/\(app\)/layout.tsx`
Expected: All three files listed.

**Step 5: Commit**

```bash
git add frontend/src/app/\(auth\)/layout.tsx frontend/src/app/\(default\)/layout.tsx frontend/src/app/\(default\)/\(app\)/layout.tsx
git commit -m "feat: create route group layouts for (auth), (default), and (app)"
```

---

### Task 1: Simplify AppLayout component

**Files:**
- Modify: `frontend/src/components/layout/AppLayout.tsx`

**Step 1: Remove session logic and Toaster from AppLayout**

The component currently (lines 1-70):
- Imports and uses `useSessionStore`, `useRouter`, `useState`, `useEffect`, `Loader2`
- Loads session, checks for active instance, redirects, shows loading spinners
- Renders Sidebar + Banners + Toaster

Simplify to a pure visual shell:

```tsx
import { Sidebar } from "./Sidebar";
import { UnsavedChangesBanner } from "../config/UnsavedChangesBanner";
import { PowerActionBanner } from "../system/PowerActionBanner";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto relative">
        <PowerActionBanner />
        <UnsavedChangesBanner />
        {children}
      </main>
    </div>
  );
}
```

Remove these imports that are no longer needed:
- `useEffect`, `useState` from "react"
- `useRouter` from "next/navigation"
- `Toaster` from "../ui/toaster"
- `useSessionStore` from "@/store/session-store"
- `Loader2` from "lucide-react"

Note: `"use client"` directive can be removed since the component no longer uses hooks. However, its children (Sidebar, banners) are client components, so Next.js will handle this automatically. Keep `"use client"` if Sidebar or banners require it at the parent level — check if removing it causes errors.

**Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit 2>&1 | head -30`
Expected: Errors about pages still importing AppLayout (expected at this stage — those pages haven't been updated yet). No errors in AppLayout.tsx itself.

**Step 3: Commit**

```bash
git add frontend/src/components/layout/AppLayout.tsx
git commit -m "refactor: simplify AppLayout to pure visual shell"
```

---

### Task 2: Move auth pages into (auth) route group

**Files:**
- Move: `frontend/src/app/login/` → `frontend/src/app/(auth)/login/`
- Move: `frontend/src/app/onboarding/` → `frontend/src/app/(auth)/onboarding/`

**Step 1: Move login directory**

```bash
cd frontend/src/app
git mv login "(auth)/login"
```

**Step 2: Move onboarding directory**

```bash
cd frontend/src/app
git mv onboarding "(auth)/onboarding"
```

**Step 3: Verify no import changes needed**

All imports use `@/` path aliases (e.g., `@/components/ui/button`, `@/lib/auth-client`). Route groups don't affect these paths. No import modifications required.

**Step 4: Verify the files are in place**

Run: `find frontend/src/app/\(auth\) -type f | sort`
Expected:
```
frontend/src/app/(auth)/layout.tsx
frontend/src/app/(auth)/login/page.tsx
frontend/src/app/(auth)/onboarding/layout.tsx
frontend/src/app/(auth)/onboarding/page.tsx
```

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor: move login and onboarding into (auth) route group"
```

---

### Task 3: Move sites page into (default) route group

**Files:**
- Move: `frontend/src/app/sites/` → `frontend/src/app/(default)/sites/`

**Step 1: Move sites directory**

```bash
cd frontend/src/app
git mv sites "(default)/sites"
```

**Step 2: Verify**

Run: `ls frontend/src/app/\(default\)/sites/page.tsx`
Expected: File exists.

**Step 3: Commit**

```bash
git add -A
git commit -m "refactor: move sites into (default) route group"
```

---

### Task 4: Move dashboard page into (default)/(app)

**Files:**
- Move: `frontend/src/app/page.tsx` → `frontend/src/app/(default)/(app)/page.tsx`

**Step 1: Move the dashboard page**

```bash
cd frontend/src/app
git mv page.tsx "(default)/(app)/page.tsx"
```

Note: `globals.css` and `layout.tsx` stay at the root. Only the dashboard `page.tsx` moves.

**Step 2: Verify**

Run: `ls frontend/src/app/\(default\)/\(app\)/page.tsx`
Expected: File exists.

**Step 3: Commit**

```bash
git add -A
git commit -m "refactor: move dashboard page into (default)/(app) route group"
```

---

### Task 5: Move all feature directories into (default)/(app)

**Files to move (all under `frontend/src/app/`):**
- `firewall/` → `(default)/(app)/firewall/`
- `network/` → `(default)/(app)/network/`
- `policies/` → `(default)/(app)/policies/`
- `routing/` → `(default)/(app)/routing/`
- `system/` → `(default)/(app)/system/`
- `vpn/` → `(default)/(app)/vpn/`
- `load-balancing/` → `(default)/(app)/load-balancing/`
- `monitoring/` → `(default)/(app)/monitoring/`
- `settings/` → `(default)/(app)/settings/`

**Step 1: Move all feature directories**

```bash
cd frontend/src/app
for dir in firewall network policies routing system vpn load-balancing monitoring settings; do
  git mv "$dir" "(default)/(app)/$dir"
done
```

**Step 2: Verify structure**

Run: `ls frontend/src/app/\(default\)/\(app\)/`
Expected: `firewall  load-balancing  monitoring  network  page.tsx  policies  routing  settings  system  vpn`

**Step 3: Verify root app/ only has layout, globals, api, and route groups**

Run: `ls frontend/src/app/`
Expected: `(auth)  (default)  api  globals.css  layout.tsx`

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor: move all feature directories into (default)/(app) route group"
```

---

### Task 6: Strip AppLayout from simple pages (single-wrap pattern)

These pages wrap ALL their content in a single `<AppLayout>...</AppLayout>`. The fix is to remove the import and the wrapping tags.

**Pages (single-wrap pattern):**
- `(default)/(app)/monitoring/page.tsx`
- `(default)/(app)/settings/page.tsx`
- `(default)/(app)/firewall/flowtables/page.tsx`
- `(default)/(app)/firewall/policies/page.tsx`
- `(default)/(app)/routing/unicast-protocols/page.tsx`
- `(default)/(app)/routing/multicast/page.tsx`
- `(default)/(app)/routing/infrastructure/page.tsx`
- `(default)/(app)/system/settings/page.tsx`
- `(default)/(app)/page.tsx` (dashboard)

**Stub/placeholder pages (minimal, single-wrap):**
- `(default)/(app)/network/routes/page.tsx`
- `(default)/(app)/network/high-availability/page.tsx`
- `(default)/(app)/system/logs/page.tsx`
- `(default)/(app)/system/services/page.tsx`
- `(default)/(app)/system/users/page.tsx`
- `(default)/(app)/vpn/ipsec/page.tsx`
- `(default)/(app)/load-balancing/wan/page.tsx`
- `(default)/(app)/load-balancing/haproxy/page.tsx`
- `(default)/(app)/load-balancing/haproxy/backend/[name]/page.tsx`
- `(default)/(app)/load-balancing/haproxy/service/[name]/page.tsx`

**Step 1: For each page, make these edits:**

1. Remove the `import { AppLayout } from "@/components/layout/AppLayout";` line
2. Remove the opening `<AppLayout>` tag
3. Remove the closing `</AppLayout>` tag
4. The page's content becomes the direct return value

Example — `network/routes/page.tsx` before:
```tsx
import { AppLayout } from "@/components/layout/AppLayout";
import { InProgress } from "@/components/layout/InProgress";

export default function RoutesPage() {
  return (
    <AppLayout>
      <InProgress />
    </AppLayout>
  );
}
```

After:
```tsx
import { InProgress } from "@/components/layout/InProgress";

export default function RoutesPage() {
  return <InProgress />;
}
```

**Step 2: Verify no AppLayout imports remain in these files**

Run: `grep -r "AppLayout" frontend/src/app/\(default\)/\(app\)/ --include="*.tsx" -l`
Expected: Only complex pages (Task 7) and static-failover layout (Task 8) should remain.

**Step 3: Commit**

```bash
git add -A
git commit -m "refactor: strip AppLayout wrapper from simple pages"
```

---

### Task 7: Strip AppLayout from complex pages (multi-branch pattern)

These pages wrap MULTIPLE conditional branches in `<AppLayout>` (loading state, error state, main content each wrapped separately). Remove all `<AppLayout>` wrappers — the layout handles the shell now.

**Pages (multi-branch pattern):**
- `(default)/(app)/firewall/bridge/page.tsx` — loading + main
- `(default)/(app)/firewall/global-options/page.tsx` — loading + main
- `(default)/(app)/firewall/groups/page.tsx` — loading + main
- `(default)/(app)/firewall/zones/page.tsx` — loading + main
- `(default)/(app)/network/interfaces/page.tsx` — loading + main
- `(default)/(app)/network/nat/page.tsx` — loading + error + main
- `(default)/(app)/network/dhcp/page.tsx` — loading + error + main
- `(default)/(app)/network/vrf/page.tsx` — multiple conditional states + main
- `(default)/(app)/vpn/wireguard/page.tsx` — multiple conditional states + main
- `(default)/(app)/policies/access-list/page.tsx` — loading + error + main
- `(default)/(app)/policies/bgp-as/page.tsx` — loading + error + main
- `(default)/(app)/policies/bgp-community/page.tsx` — loading + error + main
- `(default)/(app)/policies/bgp-extended-community/page.tsx` — loading + error + main
- `(default)/(app)/policies/bgp-large-community/page.tsx` — loading + error + main
- `(default)/(app)/policies/local-route/page.tsx` — loading + error + main
- `(default)/(app)/policies/prefix-list/page.tsx` — loading + error + main
- `(default)/(app)/policies/route-map/page.tsx` — loading + error + main
- `(default)/(app)/policies/route/page.tsx` — loading + error + main

**Step 1: For each page, make these edits:**

1. Remove the `import { AppLayout } from "@/components/layout/AppLayout";` line
2. Find EVERY `<AppLayout>` and `</AppLayout>` in the file (there will be 2-5 pairs)
3. Remove all of them — the content inside each wrapper becomes the direct return

Example pattern — `firewall/groups/page.tsx` before:
```tsx
if (loading) {
  return (
    <AppLayout>
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    </AppLayout>
  );
}

return (
  <AppLayout>
    <TooltipProvider>
    ...
    </TooltipProvider>
  </AppLayout>
);
```

After:
```tsx
if (loading) {
  return (
    <div className="flex items-center justify-center h-96">
      <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

return (
  <TooltipProvider>
  ...
  </TooltipProvider>
);
```

**Step 2: Verify no AppLayout imports remain in these files**

Run: `grep -r "AppLayout" frontend/src/app/\(default\)/\(app\)/ --include="*.tsx" -l`
Expected: Only `routing/static-failover/layout.tsx` should remain (handled in Task 8).

**Step 3: Commit**

```bash
git add -A
git commit -m "refactor: strip AppLayout wrapper from multi-branch pages"
```

---

### Task 8: Strip AppLayout from static-failover layout

**Files:**
- Modify: `frontend/src/app/(default)/(app)/routing/static-failover/layout.tsx`

**Step 1: Remove AppLayout wrapping**

This file is a nested layout (not a page). It currently wraps its sidebar + children in `<AppLayout>`. Since the parent `(app)/layout.tsx` already provides AppLayout, remove it here.

Before (lines 4, 46, 120):
```tsx
import { AppLayout } from "@/components/layout/AppLayout";
...
return (
  <AppLayout>
    <div className="flex h-full">
      ...
    </div>
  </AppLayout>
);
```

After:
```tsx
// Remove the AppLayout import line
...
return (
  <div className="flex h-full">
    ...
  </div>
);
```

**Step 2: Verify NO AppLayout imports remain anywhere in app/**

Run: `grep -r "AppLayout" frontend/src/app/ --include="*.tsx" -l`
Expected: No files. Zero matches.

**Step 3: Commit**

```bash
git add -A
git commit -m "refactor: strip AppLayout from static-failover layout"
```

---

### Task 9: Clean up redundant session guards from pages

**Files to check and clean:**
- `(default)/(app)/page.tsx` (dashboard) — has `useSessionStore`, `loadSession`, loading spinners
- `(default)/(app)/monitoring/page.tsx` — has `sessionService.getCurrentSession()`, loading/error states

**Step 1: Clean dashboard page (`page.tsx`)**

The dashboard currently calls `loadSession()` and checks `activeSession`. Since `(default)/layout.tsx` handles session loading and `(app)/layout.tsx` handles the instance guard, these are now redundant.

Remove:
- `loadSession` from `useSessionStore()` destructuring (if only used for initial load)
- The `useEffect` that calls `loadSession()` on mount
- Loading spinner that shows while session loads
- Any `if (!activeSession)` early returns

Keep:
- `activeSession` if used for rendering data (e.g., showing instance name)
- `useSessionStore()` if other properties are used (e.g., `refreshConfig`)

**Step 2: Clean monitoring page**

Similar — remove any initial session-loading logic that duplicates the layout's work. Keep feature-specific data fetching (dashboard SSE, config loading, etc.).

**Step 3: Scan all pages for remaining session-loading patterns**

Run: `grep -r "loadSession\|await loadSession" frontend/src/app/\(default\)/ --include="*.tsx" -l`
Expected: Only `(default)/layout.tsx` (which is the correct single location).

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor: remove redundant session guards from pages"
```

---

### Task 10: Remove Toaster from sites page

**Files:**
- Modify: `frontend/src/app/(default)/sites/page.tsx`

**Step 1: Check if sites page renders its own Toaster**

The sites page imports and renders `<Toaster />` directly. Since `(default)/layout.tsx` now provides `<Toaster />`, remove the duplicate from sites.

Remove:
- `import { Toaster } from "@/components/ui/toaster";`
- The `<Toaster />` JSX element in the return

**Step 2: Commit**

```bash
git add -A
git commit -m "refactor: remove duplicate Toaster from sites page"
```

---

### Task 11: TypeScript verification and structural checks

**Step 1: Run TypeScript compiler**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors. If there are errors, fix them — likely unused imports from the AppLayout cleanup.

**Step 2: Verify no page imports AppLayout**

Run: `grep -r "AppLayout" frontend/src/app/ --include="*.tsx"`
Expected: No matches.

**Step 3: Verify AppLayout is only imported by (app)/layout.tsx**

Run: `grep -r "AppLayout" frontend/src/ --include="*.tsx" -l`
Expected: Only two files:
- `frontend/src/components/layout/AppLayout.tsx` (the component itself)
- `frontend/src/app/(default)/(app)/layout.tsx` (the single consumer)

**Step 4: Verify root app/ directory is clean**

Run: `ls frontend/src/app/`
Expected: `(auth)  (default)  api  globals.css  layout.tsx`

No stray page files or feature directories at the root level.

**Step 5: Run linter**

Run: `cd frontend && npm run lint`
Expected: No new errors introduced.

**Step 6: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve TypeScript and lint errors from layout restructure"
```

---

### Task 12: Handle network/load-balancing redirect page

**Files:**
- Check: `frontend/src/app/(default)/(app)/network/load-balancing/page.tsx`

**Step 1: Verify redirect page doesn't use AppLayout**

This page is a pure redirect (`router.replace("/load-balancing/haproxy")`) with no AppLayout usage. It was already moved with the `network/` directory in Task 5. Verify it still works — the redirect URL `/load-balancing/haproxy` is still valid since route groups don't affect URLs.

Run: `cat frontend/src/app/\(default\)/\(app\)/network/load-balancing/page.tsx`
Expected: Contains `router.replace("/load-balancing/haproxy")` — no changes needed.

**Step 2: No commit needed if no changes**

---

### Task 13: Final integration commit and summary

**Step 1: Verify git status is clean**

Run: `git status`
Expected: Clean working tree (all changes committed in previous tasks).

**Step 2: Run the full app locally (if possible)**

Run: `npm run dev:frontend`

Test these routes manually:
- `/login` — renders login form, no sidebar
- `/onboarding` — renders setup wizard, no sidebar
- `/sites` — renders site manager, no sidebar, Toaster works
- `/` — redirects to `/sites` if no instance, shows dashboard with sidebar if connected
- `/firewall/policies` — shows firewall page with sidebar
- `/routing/static-failover/static-routes` — shows nested sidebar layout within app shell
- Back button from app page to `/sites` — smooth transition

**Step 3: Create a summary commit if all tasks are done separately, or squash if preferred**

All done. The app now uses three-tier nested layouts instead of per-page AppLayout wrapping.
