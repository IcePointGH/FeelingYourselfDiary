# QQ and WeChat Login Design

## Goal

Add QQ and WeChat login to the existing authentication system for `https://www.sevensense.art/`.

The first successful third-party login automatically creates a local account. Existing username/password login, JWT issuance, Redis token blacklist logout, and current API authorization behavior remain intact.

## Current State

- Backend authentication is handled by `AuthController` and `AuthService`.
- Local users are stored in `users`.
- Login and register return `AuthDTO.AuthResponse`, containing a JWT and `UserInfo`.
- Frontend `AuthContext` stores `token` and `user` in `localStorage`.
- `SecurityConfig` currently permits `/api/auth/login` and `/api/auth/register`; all other `/api/**` endpoints require JWT authentication.

## Recommended Architecture

Introduce a provider identity layer rather than replacing the local user model.

### Data Model

Add an `oauth_identities` table:

```sql
CREATE TABLE IF NOT EXISTS oauth_identities (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    provider VARCHAR(32) NOT NULL,
    provider_user_id VARCHAR(128) NOT NULL,
    union_id VARCHAR(128) DEFAULT NULL,
    nickname VARCHAR(255) DEFAULT NULL,
    avatar VARCHAR(500) DEFAULT NULL,
    created_at DATETIME(6) DEFAULT NULL,
    updated_at DATETIME(6) DEFAULT NULL,
    version BIGINT NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_oauth_provider_user (provider, provider_user_id),
    KEY idx_oauth_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

`provider` is `qq` or `wechat`. `provider_user_id` stores the provider `openid`. `union_id` is stored when returned by the provider, but login uniqueness is based on `provider + provider_user_id`.

### Backend Components

Add an `auth.oauth` package with:

- `OAuthController`: exposes OAuth login, callback, and completion endpoints.
- `OAuthService`: coordinates state verification, provider profile lookup, user creation, identity binding, and ticket issuance.
- `OAuthProviderClient`: common interface for provider implementations.
- `QqOAuthProviderClient`: QQ-specific authorization URL, token exchange, OpenID fetch, and user info fetch.
- `WeChatOAuthProviderClient`: WeChat-specific authorization URL, token exchange, OpenID fetch, and user info fetch.
- `OAuthIdentity` and `OAuthIdentityRepository`: persistence for external identities.
- OAuth DTOs for provider profile and frontend completion requests.

### Public Endpoints

```text
GET  /api/auth/oauth/{provider}/authorize?returnTo=/schedule
GET  /api/auth/oauth/{provider}/callback?code=...&state=...
POST /api/auth/oauth/complete
```

Optional later endpoints:

```text
POST   /api/auth/oauth/{provider}/bind
DELETE /api/auth/oauth/{provider}/bind
```

`SecurityConfig` must permit `/api/auth/oauth/**`.

## Login Flow

1. The user clicks QQ or WeChat login on the frontend login page.
2. Frontend redirects to `/api/auth/oauth/{provider}/authorize?returnTo=...`.
3. Backend creates a cryptographically random `state`, stores it in Redis with the requested `returnTo`, and redirects to the provider authorization page.
4. Provider redirects back to `/api/auth/oauth/{provider}/callback`.
5. Backend validates `state`; invalid or expired state fails the login.
6. Backend exchanges `code` for provider access token and obtains provider profile.
7. Backend looks up `oauth_identities` by `provider + openid`.
8. If an identity exists, backend signs a normal JWT for the linked local user.
9. If no identity exists, backend creates:
   - a local `users` row with generated username,
   - default `user_settings`,
   - a new `oauth_identities` row.
10. Backend stores the resulting `AuthResponse` behind a short-lived one-time login ticket in Redis.
11. Backend redirects to `/oauth/callback?ticket=...&returnTo=...`.
12. Frontend posts the ticket to `/api/auth/oauth/complete`.
13. Backend consumes the ticket and returns `AuthResponse`.
14. Frontend reuses existing auth storage behavior and navigates to `returnTo` or `/schedule`.

## Account Creation Rules

Generated usernames should be stable and unique, but should not expose raw OpenID:

```text
qq_{hash(openid)}
wechat_{hash(openid)}
```

The local nickname and avatar use provider profile values when available. The local password should contain a strong random BCrypt-encoded placeholder value because OAuth-created accounts cannot use password login until a future password setup flow exists.

Default user settings must be created in the same transaction as the local user and OAuth identity.

## Ticket and State Handling

Use Redis through the existing cache layer or a small OAuth-specific Redis helper.

Recommended keys:

```text
oauth:state:{state} -> provider, returnTo
oauth:ticket:{ticket} -> AuthResponse, returnTo
```

Recommended TTL:

- State: 5 minutes
- Ticket: 2 minutes

Both state and ticket must be single-use.

Do not put JWT tokens directly in the URL.

## Configuration

Add environment-backed properties:

```properties
oauth.qq.client-id=${QQ_CLIENT_ID:}
oauth.qq.client-secret=${QQ_CLIENT_SECRET:}
oauth.qq.redirect-uri=${QQ_REDIRECT_URI:https://www.sevensense.art/api/auth/oauth/qq/callback}

oauth.wechat.client-id=${WECHAT_CLIENT_ID:}
oauth.wechat.client-secret=${WECHAT_CLIENT_SECRET:}
oauth.wechat.redirect-uri=${WECHAT_REDIRECT_URI:https://www.sevensense.art/api/auth/oauth/wechat/callback}

app.frontend-base-url=${FRONTEND_BASE_URL:https://www.sevensense.art}
```

Production `.env` must provide real app IDs and secrets from QQ Connect and WeChat Open Platform.

## Frontend Changes

Update `AUTH_API` with OAuth endpoints.

Add QQ and WeChat buttons to the login page. Each button redirects the browser to the backend authorize endpoint.

Add an OAuth callback page at `/oauth/callback` that:

- reads `ticket` and `returnTo`,
- calls `/api/auth/oauth/complete`,
- stores the returned token and user using the existing auth flow,
- redirects to `returnTo` when safe, otherwise `/schedule`,
- shows a clear error state if completion fails.

Refactor `AuthContext` to share an `applyAuthResponse` helper between password login, register, and OAuth callback.

## Error Handling

Expected user-facing cases:

- unsupported provider,
- OAuth configuration missing,
- provider denies authorization,
- expired or invalid state,
- failed provider token exchange,
- failed provider profile fetch,
- expired or already-used login ticket.

Error messages should be non-sensitive. Logs may include provider and failure category, but must not log access tokens, refresh tokens, app secrets, raw OpenID, or full provider responses.

## Security Notes

- Use `state` for CSRF protection.
- Use HTTPS-only production callback URLs.
- Restrict `returnTo` to same-site relative paths.
- Do not expose client secrets to the frontend.
- Do not put JWT tokens in query strings.
- Keep current JWT blacklist logout behavior unchanged.
- Store provider tokens only if needed later. This feature does not require storing provider access tokens.

## Testing

Backend unit tests:

- existing identity logs in existing user,
- new identity creates user, settings, and identity in one transaction,
- duplicate provider identity is rejected by repository uniqueness,
- invalid state fails,
- expired or missing ticket fails,
- generated usernames are stable and unique enough for provider identities,
- `/api/auth/oauth/**` is permitted by security configuration.

Frontend verification:

- login page renders QQ and WeChat buttons,
- clicking buttons navigates to backend authorize URLs,
- callback page exchanges ticket and applies auth response,
- callback error states are visible and do not leave partial auth state.

## Out of Scope

- Password setup for OAuth-created accounts.
- Binding and unbinding provider identities from settings.
- Migrating JWT from `localStorage` to HttpOnly cookies.
- Storing long-lived provider access tokens.
- Mobile app OAuth flows.
