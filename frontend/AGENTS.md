# Frontend — Knowledge Base

## OVERVIEW
React 19 SPA with TypeScript, Vite 8, React Router DOM 7, Recharts 3. CSS Modules + global shared styles. No CSS framework. React Context for state management. Port 3000 (dev).

## STRUCTURE
```
frontend/src/
├── main.tsx              # Entry point, mounts App with StrictMode
├── App.tsx               # Root component: providers + BrowserRouter + routes
├── index.css             # Global reset + dark mode ([data-theme='dark'])
├── App.css               # App-level styles
├── components/           # Shared UI components
│   ├── Layout/           # Main layout (sidebar + content)
│   ├── Sidebar/          # Navigation sidebar
│   ├── DateInput/        # Date picker
│   ├── FeelingSelector/  # Mood value selector (-3 to +3)
│   ├── FeelingSlider/    # Slider-based mood input
│   ├── ScheduleItemCard/ # Schedule item display card
│   ├── CollapsiblePanel/ # Accordion panel
│   ├── StatCard/         # Statistics display
│   ├── Toast/            # Toast notifications
│   ├── common/
│   │   └── ErrorBoundary # Render error catch
│   ├── EmptyState/        # Empty state placeholder
│   ├── Skeleton/          # Loading skeleton component
│   └── PageSkeleton       # Lazy-load fallback
├── contexts/             # React Context providers
│   ├── AuthContext        # JWT auth state (login/logout/register)
│   ├── ThemeContext       # Theme switching (Morandi/Minimal)
│   ├── ToastContext       # Global toast messages
│   └── EmotionLabelsContext # Custom emotion label texts
├── hooks/                # Custom hooks
│   ├── useApi.ts         # Authenticated API request wrapper
│   ├── useFetch.ts       # Generic data loading (loading/error/data)
│   ├── useFeelingMode.ts # Feeling input mode manager
│   ├── useAiAnalysis.ts  # AI analysis state machine (idle→progress→letter→report|error)
│   └── useTabCache.ts    # Generic tab-state caching (save/restore across tab switches)
├── pages/                # Route page components
│   ├── Welcome/          # Landing page (public)
│   ├── Login/            # Login (public)
│   ├── Register/         # Registration (public)
│   ├── Schedule/         # Main schedule + mood recording
│   ├── Thoughts/         # Diary writing and review
│   ├── History/          # Calendar + paginated list (lazy-loaded)
│   ├── Analysis/         # Mood charts daily/weekly/monthly (lazy-loaded)
│   ├── AI/               # AI chat + analysis (AIChatPanel / SessionSidebar / ContextPicker)
│   └── Settings/         # Theme, labels, data management (lazy-loaded)
├── services/
│   └── api.ts            # API endpoint URL constants
├── styles/
│   └── shared.css        # Shared classes: card, form-group, feeling-badge, etc.
├── types/
│   └── index.ts          # TypeScript type definitions
└── utils/
    ├── calendar.ts       # Calendar generation
    └── feeling.ts        # Feeling value formatting
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Add a new page | `pages/YourPage/` + add route in `App.tsx` | Lazy-load if not primary: `React.lazy()` + `<Suspense>` |
| Add a new component | `components/YourComponent/` | One component per directory with `.tsx` + `.module.css` |
| Add API endpoints | `services/api.ts` | Export URL constants following existing pattern |
| Add types | `types/index.ts` | Add to existing interfaces, no new type files |
| Add global styles | `styles/shared.css` | Use existing class patterns (card, form-group, etc.) |
| Add a context | `contexts/YourContext.tsx` + wrap in `App.tsx` provider chain | Follow AuthContext pattern |
| Auth state (login/logout) | `contexts/AuthContext.tsx` | JWT in localStorage, API calls via `useApi` |
| Theme toggle | `contexts/ThemeContext.tsx` | Sets `data-theme` attribute on `<html>` |
| API calls | `hooks/useApi.ts` (authenticated), `hooks/useFetch.ts` (generic) | useFetch returns `{data, loading, error}` |
| AI analysis flow | `hooks/useAiAnalysis.ts` | Idle→progress→letter→report|error state machine |
| Tab state caching | `hooks/useTabCache.ts` | Generic save/restore per tab key |
| Dark mode styles | `index.css` | Selector: `[data-theme='dark']` |
| Route definitions | `App.tsx` lines 33-44 | 8 routes total, 3 lazy-loaded |
| AI chat / SSE | `pages/AI/ChatView.tsx` | SSE stream parsing, RAF rendering, plain text during streaming |
| AI analysis / modes | `pages/AI/AI.tsx` | Chat / Range / Full-history tabs, polling, consent |

## CONVENTIONS
- **State**: React Context only (no Redux, Zustand, Recoil). Each context in its own file under `contexts/`.
- **State machines**: Pages with 5+ related `useState` hooks managing a conceptual state machine should extract the machine into a custom hook (see `useAiAnalysis.ts`). The hook owns all transitions and guarantees internal consistency. Prevents bugs where scattered `setX()` calls drift out of sync.
- **Tab/page caching**: For pages with tabs where data is fetched on-demand, use `useTabCache.ts` rather than ad-hoc `useRef` caches. Provides save/restore/remove primitives with a typed generic interface.
- **Styling**: CSS Modules for component styles. `shared.css` for cross-component patterns. NO Tailwind, NO CSS-in-JS.
- **Data fetching**: `useFetch` hook returns `{data, loading, error}` triplet. Components handle all three states.
- **Auth**: JWT in localStorage. `useApi` hook auto-attaches `Authorization: Bearer` header. Logout adds token to Redis blacklist.
- **Lazy loading**: `React.lazy()` for History, Analysis, Settings pages. `<PageSkeleton />` as shared fallback.
- **Error handling**: `ErrorBoundary` wraps entire app. `Toast` for user-facing messages (replaces `alert()`). API errors caught in hooks, surfaced via ToastContext.
- **Naming**: PascalCase components, camelCase hooks/utils, kebab-case CSS class names in `shared.css`.
- **SSE streaming**: Backend Spring `SseEmitter` outputs `data:{text}\n\n` (NO space after colon). Frontend MUST NOT expect `data: ` with space. Use `startsWith('data:')` and strip optional leading space. Accumulate chunks in a `useRef` and throttle UI updates via `requestAnimationFrame` (60fps). During streaming, render as **plain text** (e.g. `white-space: pre-wrap`) — do NOT use `ReactMarkdown` which re-parses entire content on every frame. After stream completes, render final message with `ReactMarkdown`.

## ANTI-PATTERNS
- **Do NOT** add state management libraries (Redux, Zustand, etc.) -- React Context is intentional.
- **Do NOT** manage a single conceptual state machine with 5+ independent `useState` hooks -- extract into a custom hook or `useReducer`. Scattered `setX()` calls cannot enforce invariants (e.g., "when aiPhase is `progress`, aiLoading must be `true`").
- **Do NOT** add CSS frameworks (Tailwind, Bootstrap) -- plain CSS Modules + shared.css is the convention.
- **Do NOT** add new charting libraries -- Recharts 3 is already used for Analysis page.
- **Do NOT** use `alert()` or `confirm()` -- use ToastContext for user notifications.
- **Do NOT** make API calls directly from components -- use `useApi` or `useFetch` hooks.
- **Do NOT** add new `eslint-disable` comments -- fix the underlying issue instead.
- **Do NOT** import `schedule-app.html` -- it's a standalone prototype, not part of the React build.

## COMMANDS
```bash
npm run dev       # Dev server on :3000 (proxies /api => :8080)
npm run build     # Production build => dist/
npm run lint      # ESLint
npm run preview   # Preview production build
```

## NOTES
- No test infrastructure exists (no Vitest, Jest, or Playwright).
- `eslint-disable-next-line` appears 10 times in contexts -- review and fix.
- `AuthContext.tsx` has TODO: switch JWT storage from localStorage to httpOnly cookies for production.
- Dark mode uses `[data-theme='dark']` CSS selector, not CSS variables.
- Font Awesome 6.5.1 loaded via CDN in `index.html`.

## DEPLOYMENT
- **API URL**: All endpoints use relative `/api` paths (`api.ts`). No build-time env var needed — works on any origin (localhost, IP, domain).
- **Build**: `npm run build` outputs static files to `dist/`. Served by Nginx in production Docker stack.
- **Proxy**: In Docker, Nginx (`nginx.conf`) proxies `/api` → `http://backend:8080`. Caddy handles external traffic + TLS.
