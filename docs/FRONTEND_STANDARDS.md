# Frontend standards and guidelines

This document defines performance, UX, and architectural standards for the Campus Circle frontend. Follow these so the app stays fast, predictable, and demo-ready.

---

## 1. Auth and first load

### 1.1 Single auth bootstrap

- **On app load**, if a stored token exists, run **one** bootstrap flow: validate token and load user + profile + tenant in a single place.
- **Do not** show auth-dependent UI (e.g. “Login / Register” vs user name) until bootstrap has finished. While `token` exists but bootstrap is still running, show a **neutral loading state** (e.g. header skeleton or “Loading…”) so the UI does not flash “Login / Register” and then switch to the user.
- **Implement** bootstrap by calling `/users/me` and `/tenants/current` in parallel, then updating both auth and profile/tenant state from that response. No separate “validate token” then “fetch profile” then “fetch tenant” on different screens.

### 1.2 No login/register flash on reload

- **Never** render “Login / Register” when we still have a token and have not yet determined that the token is invalid.
- Use an **auth check complete** flag (e.g. `authCheckComplete`): only after it is `true` do we treat “has token but no user” as “show Login / Register”.
- Until then, treat “has token, no user yet” as “loading” and show a loading state in the header/nav.

### 1.3 Single source for profile and tenant

- After login or bootstrap, **profile** (full_name, role, is_super_admin, etc.) and **tenant** (currentTenant, allowedTenantSlugs) must be in the store so the Navbar and TenantSwitcher can render without extra requests.
- **Navbar** and **TenantSwitcher** must not trigger `/users/me` or `/tenants/current` on every mount; they read from the store. Refetch profile only after explicit user actions (e.g. edit profile, tenant switch).

---

## 2. Performance

### 2.1 Avoid redundant network calls

- **Profile**: Fetched once at bootstrap (or login). Individual pages must not call `/users/me` on mount unless they need a fresh value after an action (e.g. after saving profile).
- **Tenant**: Fetched once at bootstrap (or login). TenantSwitcher reads from store; after tenant switch (full reload) the new page load runs bootstrap again.
- **Events list**: The app uses a single `fetchEvents` thunk with a **2-minute stale window**: if events were fetched recently, navigation to home/events/contact reuses the cache and does not refetch. Deduplicate by using the same thunk so RTK dedupes in-flight requests.

### 2.2 Loading and skeleton states

- **Lists and tables**: Show skeletons or “Loading…” while data is fetched. Avoid empty tables that suddenly fill.
- **Auth**: Use the single loading state during bootstrap; no spinner in every component that touches auth.
- **Buttons** that trigger mutations: Use loading state (disabled + spinner) so the user knows the action is in progress.

### 2.3 Lazy load where it helps

- **Admin** or heavy routes can be lazy-loaded so the initial bundle is smaller and first paint is faster. Prefer `React.lazy` + `Suspense` for route-level code splitting where the gain is meaningful.

---

## 3. UX consistency

### 3.1 Labels and tenant/profile in header

- **User name** in the header must come from one place: `profile.full_name` or `user.name` (with a clear fallback order). Do not show “Profile” or email as the main label when we have a name.
- **Tenant** in the header and in the profile dropdown must show the **current tenant name** from the store (e.g. `currentTenant.name`), not only the slug. After tenant switch and reload, bootstrap fills `currentTenant` so the label is correct immediately.
- **Role** (e.g. “Super Admin”, “Admin”, “Parent”) must come from profile/user in the store so it doesn’t “update” after a delay.

### 3.2 Tenant switch

- On tenant switch: update `localStorage` (tenant slug), then **full page reload** so the app re-runs bootstrap with the new tenant header. This keeps backend and frontend tenant in sync and avoids stale profile/events.
- After reload, the header must show the new tenant name and profile without flashing “Login / Register” (see 1.2).

### 3.3 Logout

- On logout, clear **auth** and **profile** (and any tenant-specific client state) so the next view is consistently “guest”. Dashboard slice should clear `profile` when the user logs out.

---

## 4. Demo and maintainability

### 4.1 Predictable state

- **Auth**: One place (e.g. auth slice) holds token, user, currentTenant, allowedTenantSlugs, and `authCheckComplete`. Other slices (e.g. dashboard) hold profile and clear it on logout.
- **No duplicate “sources of truth”**: e.g. don’t have both “user.role” and “profile.role” updated at different times; prefer profile as the canonical source after bootstrap, with user as a fallback for the brief moment before profile is set.

### 4.2 Error handling

- **Network errors**: Show a short, user-friendly message (e.g. “Cannot reach server. Check your connection.”) and optionally a retry.
- **401 on bootstrap**: Clear token and user, set `authCheckComplete = true`, then the UI shows Login.

### 4.3 Making changes safely

- Before adding a new **global** fetch (e.g. “fetch profile on every nav”): check this doc and the bootstrap flow; prefer reading from store or a single fetch at bootstrap/login.
- Before adding a new **loading** state: ensure it doesn’t conflict with the single auth loading state and doesn’t cause layout shift (e.g. use skeleton height).
- When adding a new **role or tenant**-dependent feature: read `profile` and `currentTenant` from the store; don’t refetch unless the user explicitly switched tenant or updated profile.

---

## 5. Summary checklist

- [ ] One auth bootstrap on load when token exists; no separate validate-then-fetch-profile-then-fetch-tenant.
- [ ] No “Login / Register” flash: use `authCheckComplete` and show loading until we know auth state.
- [ ] Profile and tenant in store after bootstrap/login; Navbar and TenantSwitcher read from store only.
- [ ] No redundant `/users/me` or `/tenants/current` on route changes.
- [ ] Events list: single fetch, optional stale time; dedupe via shared thunk.
- [ ] Header labels: user name and tenant name from store; no late “label update” after reload.
- [ ] Logout clears auth and profile.
- [ ] Tenant switch: update slug + full reload; after reload, bootstrap runs and UI is correct.
