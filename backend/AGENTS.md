# Backend — Knowledge Base

## OVERVIEW
Spring Boot 4.0.5 REST API on Java 21. Feature-organized modular monolith with domain packages. Port 8080.

## STRUCTURE
```
backend/src/main/java/com/diaryproject/backend/
├── auth/           # User auth (login, register, JWT, logout/blacklist)
├── schedule/       # Daily schedule CRUD with mood values
├── diary/          # Free-form diary entries per date
├── analysis/       # JPQL aggregate queries for mood stats (daily/weekly/monthly)
├── settings/       # User preferences (theme, emotion labels, data export)
├── common/
│   ├── cache/      # Redisson + Spring Cache abstraction (CacheService, CacheKeys, CacheConstants)
│   ├── config/     # SecurityConfig, RedisConfig
│   ├── dto/        # ApiResponse<T> uniform response wrapper
│   ├── exception/  # BusinessException hierarchy + GlobalExceptionHandler
│   ├── filter/     # JwtAuthenticationFilter + MdcTracingFilter
│   └── security/   # JwtUtil
└── BackendApplication.java
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| Add new API module | Copy an existing module (controller/dto/entity/repository/service) | All follow identical Spring Boot pattern |
| Auth logic | `auth/controller/AuthController.java`, `common/filter/JwtAuthenticationFilter.java` | JWT validated per request, blacklist checked via Redis |
| Cache operations | `common/cache/CacheService.java` (interface), impl in same package | Redis auto-degrades to DB on failure |
| Add cache | `common/cache/CacheKeys.java` for manual keys, `@Cacheable` on service methods | `:` vs `::` separator -- do NOT mix |
| Exception mapping | `common/exception/GlobalExceptionHandler.java` | ResourceNotFound=>404, BadRequest=>400, Unauthorized=>401, Conflict=>409 |
| Response format | `common/dto/ApiResponse.java` | All endpoints return `{code, message, data}` |
| JWT operations | `common/security/JwtUtil.java` | Validate, generate, extract userId |
| Logging | `logback-spring.xml` (JSON + console dual-channel) | MDC injects traceId + userId per request |
| DB schema | JPA `ddl-auto=update` (auto-managed) | `init.sql` is placeholder for future seed data |
| Redis config | `common/config/RedisConfig.java`, `application.properties` | Redisson client, cache TTL 5min, key prefix `diary::` |
| Env vars | `application.properties` reads `${VAR:default}` | `.env` at project root supplies values in dev |

## CONVENTIONS
- **Module structure**: Every feature module has: `controller/`, `dto/`, `entity/`, `repository/`, `service/`. EXACTLY this layout.
- **Transactions**: `@Transactional` on all write service methods. `@Transactional(readOnly=true)` on queries.
- **Validation**: Bean Validation annotations on DTOs. Invalid input rejected at Controller layer.
- **Response envelope**: All endpoints return `ResponseEntity<ApiResponse<T>>`. Never raw entities.
- **Exception handling**: Throw subclass of `BusinessException`. Never catch and return error manually -- let GlobalExceptionHandler map it.
- **Optimistic locking**: `@Version Long version` on User, Schedule, Diary entities. Initialized to `0L`.
- **MDC tracing**: `traceId` and `userId` auto-injected per request by MdcTracingFilter. Available in all log statements.
- **Testing**: Pure Mockito. No Spring context. Mocks created manually (`mock()`). See test conventions section.

## ANTI-PATTERNS
- **Do NOT** return raw entities or strings from controllers -- always wrap in `ApiResponse<T>`.
- **Do NOT** catch and handle exceptions in controllers -- throw `BusinessException` and let GlobalExceptionHandler handle.
- **Do NOT** use `CacheKeys.*` format with `@Cacheable` annotations -- different key separators.
- **Do NOT** instantiate `CacheKeys` or `CacheConstants` -- utility classes with private constructors.
- **Do NOT** add `@SpringBootTest` unless necessary -- prefer pure Mockito (see test conventions).
- **Do NOT** change `ddl-auto` without migration plan -- schema is JPA-managed.

## TEST CONVENTIONS
- **Framework**: JUnit 5 + Mockito. No Spring context. 121 tests in 17 classes.
- **Pattern**: Each test class mirrors a production package. Method naming: `methodName_scenario_whenCondition`.
- **Structural tests**: Tests verify annotation presence (`@Transactional`, `@Cacheable`, `@Version`, `@Table.indexes`) via reflection -- intentional design decision for compile-time-untraceable metadata.
- **Disabled tests**: `@Disabled("Requires running Redis/MySQL")` -- integration tests to be enabled when infra available.
- **Run**: `./mvnw test`

## COMMANDS
```bash
./mvnw spring-boot:run    # Dev server on :8080
./mvnw test               # Run all 121 tests
./mvnw package -DskipTests # Build executable JAR
```
