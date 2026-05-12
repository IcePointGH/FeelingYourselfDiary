# Feeling Yourself Diary — Knowledge Base

**Generated:** 2026-05-11
**Commit:** 6b0ca80
**Branch:** main

## OVERVIEW
Full-stack emotion/mood diary app. Users record daily schedules with mood values (-3 to +3), write diary entries, view analysis charts (daily/weekly/monthly). React 19 SPA + Spring Boot 4.0.5 REST API + MySQL/Redis/MinIO infra.

## STRUCTURE
```
./
├── frontend/           # React 19 + TypeScript + Vite 8 SPA
├── backend/            # Spring Boot 4.0.5 + Java 21 + Maven REST API
├── docs/               # Environment setup guide, fix plans, specs
├── docker-compose.yml       # Dev infra (MySQL, Redis, MinIO)
├── docker-compose.prod.yml  # Production stack (+Caddy, Nginx, Docker builds)
├── Caddyfile           # Production HTTPS reverse proxy (sevensense.art)
├── .env.example        # Required env vars template
└── schedule-app.html   # Standalone prototype (vanilla JS, NOT part of React app)
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Add frontend page | `frontend/src/pages/YourPage/` + route in `App.tsx` | See `frontend/AGENTS.md` |
| Add backend API | `backend/.../yourmodule/controller/` | See `backend/AGENTS.md` |
| Auth (login/register/JWT) | `backend/.../auth/`, `frontend/src/contexts/AuthContext.tsx` | JWT + Redis blacklist for logout |
| Schedule CRUD | `backend/.../schedule/`, `frontend/src/pages/Schedule/` | Mood values -3 to +3 per item |
| Diary CRUD | `backend/.../diary/`, `frontend/src/pages/Thoughts/` | Free-form text per date |
| Emotion analysis | `backend/.../analysis/`, `frontend/src/pages/Analysis/` | JPQL aggregate queries + Recharts |
| User settings | `backend/.../settings/`, `frontend/src/pages/Settings/` | Theme, labels, data management |
| Caching layer | `backend/.../common/cache/` | Redisson + Spring Cache, Cache-Aside |
| Exceptions | `backend/.../common/exception/` | BusinessException hierarchy => HTTP mapping |
| Frontend state | `frontend/src/contexts/` | Auth, Theme, Toast, EmotionLabels (React Context) |
| API endpoints | `frontend/src/services/api.ts` | All endpoint URL constants |
| TypeScript types | `frontend/src/types/index.ts` | Shared type definitions |
| Shared CSS | `frontend/src/styles/shared.css` | Card, form, button, feeling-badge classes |
| Global CSS/dark mode | `frontend/src/index.css` | `[data-theme='dark']` selector |
| Docker infra | `docker-compose.yml`, `docker-compose.prod.yml` | MySQL 8.0, Redis 7, MinIO, Caddy |
| Env config | `.env.example`, `backend/.../application.properties` | All sensitive values via env vars |

## CONVENTIONS (Project-Specific)
- **Backend**: All modules follow Controller=>Service=>Repository=>Entity pattern. `@Transactional` on writes, `readOnly=true` on queries. `@Version` optimistic locking on core entities. Bean Validation on DTOs. `ApiResponse<T>` uniform response envelope.
- **Frontend**: React Context for state (no Redux/Zustand). CSS Modules + global shared CSS (no Tailwind). Route lazy-loading via `React.lazy()` for non-primary pages.
- **API design**: RESTful, `/api` prefix, pagination via `?page=0&size=20`. All responses wrapped in `ApiResponse<T>` (code/message/data).
- **Auth**: JWT stateless, Redis token blacklist for logout, BCrypt passwords, fuzzy error messages (anti-enumeration).
- **Cache key convention**: Direct `CacheService` uses `:` separator. Spring `@Cacheable` uses `::` separator. DO NOT mix.
- **Testing**: Backend only -- pure Mockito unit tests (no Spring context). No frontend tests exist. See `backend/AGENTS.md`.

## ANTI-PATTERNS (THIS PROJECT)
- **Do NOT refactor adjacent code** when fixing bugs or adding features. Surgical changes only.
- **Do NOT add new dependencies** without explicit justification. No charting libraries (Recharts already used), no state management libs (React Context pattern is intentional).
- **Do NOT mix `CacheService` direct keys with `@Cacheable` keys** -- different separators (`:` vs `::`).
- **Do NOT instantiate utility classes** (`CacheKeys`, `CacheConstants`) -- private constructors throw.
- **Do NOT delete `schedule-app.html`** -- it's a design reference prototype (not in the React build).

## COMMANDS
```bash
# Infrastructure
docker-compose up -d                    # Start MySQL + Redis + MinIO
docker-compose down                     # Stop services

# Frontend (cd frontend)
npm run dev                             # Dev server on :3000, proxies /api => :8080
npm run build                           # Production build => dist/
npm run lint                            # ESLint

# Backend (cd backend)
./mvnw spring-boot:run                  # Run on :8080
./mvnw test                             # Run 121 unit tests
./mvnw package -DskipTests              # Build JAR

# Production
docker-compose -f docker-compose.prod.yml up -d   # Full production stack
```

## NOTES
- `backend/src/main/resources/application.properties` has TODO for production: change `ddl-auto=update` => `validate`, harden JWT secret, tune HikariCP.
- `SecurityConfig.java` has TODO: lock down CORS origins, raise BCrypt strength to 12.
- `AuthContext.tsx` has TODO: switch from localStorage to httpOnly cookies for JWT.
- Frontend has zero test infrastructure (no Vitest/Jest/Playwright).
- `.env.production` exists in git (placeholder values) -- real secrets must be injected at deployment.
- `schedule-app.html` is a standalone vanilla-JS prototype -- not imported by React app.

## Agent skills

### Issue tracker
GitHub Issues — `IcePointGH/FeelingYourselfDiary`. See `docs/agents/issue-tracker.md`.

### Triage labels
Default labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs
Multi-context — root `AGENTS.md` + `backend/AGENTS.md` + `frontend/AGENTS.md`. See `docs/agents/domain.md`.
