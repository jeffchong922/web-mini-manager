# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # Start dev server (port 3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint (Next.js core-web-vitals + typescript rules)
```

## Environment variables

- `AUTH_USERS` — multi-user credentials in `user:pass:role;user:pass:role` format. Roles: `admin` or `tester`. Parsed by `lib/auth.ts`.
- `AUTH_USERNAME` / `AUTH_PASSWORD` — legacy fallback (single admin user). Only used when `AUTH_USERS` is empty.
- `AUTH_SECRET` — HS256 symmetric key for JWT session tokens. Must be >= 32 chars. Used by `lib/session.ts` and `proxy.ts`.
- `PORT` — server port (defaults to 9527 via `ecosystem.config.js` in production).

## Architecture

### Custom Next.js version (Next.js 16)

This is **not** standard Next.js. APIs, conventions, and file structure may differ from your training data. Check `node_modules/next/dist/docs/` before writing any Next.js-specific code. Notable differences observed:

- **No `middleware.ts`**. Instead, `proxy.ts` exports a named `proxy` function (receives `NextRequest`) and a `config.matcher`. The runtime picks it up as middleware automatically.
- Route handlers receive `params` as a `Promise` (e.g. `{ params }: { params: Promise<{ path: string[] }> }`).

### `proxy.ts` — middleware + auth guard

`proxy.ts` is the Next.js middleware. It handles: auth gating (redirect to `/login`), public-path bypass (`/login`, `/api/login`), and JWT renewal on every request (sliding 3-hour expiry). Note: `proxy.ts` contains its own JWT sign/verify logic (duplicated from `lib/session.ts`) because middleware runs in an Edge-like runtime where `server-only` and `cookies()` from `next/headers` are unavailable.

### PM2 production deployment

`ecosystem.config.js` configures PM2 to run `npm start` on port 9527 (`PORT` env var) with `NODE_ENV=production`.

### Tailwind CSS v4

Uses the Tailwind v4 CSS-first configuration (not `tailwind.config.js`). Key differences from v3:

- `globals.css` uses `@import "tailwindcss"` (not `@tailwind base/components/utilities`).
- Theme customization uses `@theme inline { ... }` blocks in CSS.
- The PostCSS plugin is `@tailwindcss/postcss` (not `tailwindcss`).

### Shared types (`types/wx-api.ts`)

WeChat API response/request types live here: `ResponseData<T>`, `MiniProgramItem`, `TemplateItem`, `DraftItem`, `CodeCommitParams`, `ExtConfig`, `ExtJson`. Import from `@/types/wx-api`.

### `server-only` convention

`lib/session.ts` imports `server-only` to prevent accidental client-side bundling of server secrets (JWT signing, cookie manipulation). Do the same for any new file that handles server-side secrets.

`createSession(username, role)` stores the role in the JWT payload. `verifySession` is wrapped in React's `cache()` and returns `SessionPayload | null` (`{ username, role }`).

### Import alias

`@/*` maps to the project root (`./*`), not `./src/*`. There is no `src/` directory.

### Auth flow

1. `proxy.ts` runs on every matched request. It checks for a `session` cookie (JWT signed with HS256 via `jose`). Public paths: `/login`, `/api/login`.
2. If unauthenticated and not on a public path → redirects to `/login?redirect=<original>`.
3. If authenticated and on a public path → redirects to `/`.
4. On every authenticated request, the proxy refreshes the JWT with a fresh 3-hour expiry (sliding expiration).
5. Login form (`app/login/page.tsx`) POSTs to `/api/login/route.ts`, which verifies credentials against `AUTH_USERS` (or legacy `AUTH_USERNAME`/`AUTH_PASSWORD`) and calls `createSession(username, role)`.
6. `lib/session.ts` uses React's `cache()` wrapper on `verifySession` so it deduplicates within a single render pass.
7. The dashboard layout (`app/(dashboard)/layout.tsx`) hits `/api/session` every 15 minutes as a heartbeat, keeping the session alive via the proxy's sliding refresh.

### Role-based access control (`lib/auth.ts`)

Two roles: `admin` (full access) and `tester` (limited access).

- **`parseUsers(envValue)`** — parses `AUTH_USERS` env var (`"user:pass:role;user2:pass2:role2"`) into `AuthUser[]`.
- **`findMatchingUser(users, username, password)`** — constant-time comparison via `crypto.timingSafeEqual`.
- **`TESTER_ALLOWED_API_PATHS`** — WeChat API endpoints testers can call via the proxy: `getTestQrcode`, `codeCommit`, `gettemplatelist`. Other paths return 403.
- **UI restrictions**: the dashboard layout hides the "Templates" nav item for tester-role users.
- **`/api/session`** (GET) — returns `{ username, role }` for the current session (used by the layout to determine role-based UI).

### WeChat API proxy

All WeChat API calls go through `/api/wx-proxy/[...path]/route.ts` to avoid CORS issues. The client must include an `X-Wx-Base-Url` header with the WeChat API base URL (stored in `localStorage` under key `wxBaseUrl`, set via the Settings page).

Supported methods: GET, POST, PUT, DELETE. Only `content-type`, `authorization`, and `accept` headers are forwarded upstream. The `Content-Encoding` header is stripped from the response since `fetch` transparently decompresses.

The proxy enforces RBAC: it reads the session cookie directly from the request and checks tester-role users against `TESTER_ALLOWED_API_PATHS`. Non-matching paths return 403.

### Client-side WeChat API wrapper (`lib/wx-proxy.ts`)

`wxFetch<T>(path, options?, cacheConfig?)` is the client-side helper for calling the WeChat API:

- Reads the base URL from `localStorage` and appends the path to `/api/wx-proxy/`.
- **Caching**: GET/HEAD responses are cached in `localStorage` (1-hour default TTL). Only responses with `code === "000000"` are cached. Evicts half the cache entries (oldest first) on `QuotaExceededError`.
- **Deduplication**: In-flight requests are tracked in a `Map`. Concurrent identical calls share a single network request.
- Pass `false` as the third argument to disable caching for a specific call.

### Pages

| Route | File | Description |
|---|---|---|
| `/login` | `app/login/page.tsx` | Login form with redirect param support |
| `/` | `app/(dashboard)/page.tsx` | Welcome page, shows logged-in username |
| `/mini-programs` | `app/(dashboard)/mini-programs/page.tsx` | Paginated table of authorized mini programs (client-side search + pagination). QR code viewer, tester bind/unbind, and code-commit submission modals that read submit configs from localStorage. |
| `/templates` | `app/(dashboard)/templates/page.tsx` | Paginated table of code templates, with draft-to-template "add" modal and delete actions. |
| `/submit-configs` | `app/(dashboard)/submit-configs/page.tsx` | Manages ext.json submission configs in localStorage (key `submitConfigs`). Import/export JSON, edit, delete, toggle isStop. Data consumed by mini-programs page for the "Submit" action. |
| `/settings` | `app/(dashboard)/settings/page.tsx` | Configure WeChat API base URL (stored in localStorage under key `wxBaseUrl`) |
| 404 | `app/not-found.tsx` | Custom 404 page |

The `(dashboard)` route group shares a sidebar layout (`app/(dashboard)/layout.tsx`) with nav links and a Sign Out button that POSTs to `/api/logout`.

**Data fetching pattern**: Client pages defer initial data loads past render via `useEffect(() => { queueMicrotask(() => { load(); }); }, [load])`. This avoids blocking the first paint. The `load` callback is wrapped in `useCallback` and accepts a `skipCache` boolean — pass `true` for refresh operations, `undefined`/omitted for cached reads.

**Cross-page localStorage**: The `/submit-configs` page persists configs to `localStorage` under key `submitConfigs`. The `/mini-programs` page reads the same key to check whether each mini-program has a submit config — if present, the "Submit" button is active; otherwise it's greyed out. Both pages must stay in sync on the data shape (`SubmitConfigItem[]`).

**No test framework**: No test runner (vitest, jest, etc.) is configured. There are no test files.

### API response format

All WeChat API responses follow this shape:

```typescript
type ResponseData<T = null> = {
  code: string;    // "000000" indicates success
  data: T;
  message: string;
  succeed: boolean;
};
```

## 微信第三方平台

- [第三方平台介绍](https://developers.weixin.qq.com/doc/oplatform/Third-party_Platforms/2.0/getting_started/terminology_introduce.html)
- [第三方平台 API](https://developers.weixin.qq.com/doc/oplatform/openApi/)（数据转换以项目定义为准）

所有第三方接口都需要通过 Next.js `/api/wx-proxy/` 进行代理转发，避免跨域报错。
