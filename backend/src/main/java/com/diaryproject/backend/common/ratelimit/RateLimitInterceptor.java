package com.diaryproject.backend.common.ratelimit;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneId;

/**
 * HandlerInterceptor that enforces per-user rate limiting on {@code /api/ai/**} endpoints.
 * <p>
 * Uses {@link RateLimitService} (Redis-backed) to cap each user at 50 AI calls per day.
 * When the limit is exceeded a 429 {@code application/json} response is returned.
 * Successful requests carry {@code X-RateLimit-Remaining} and {@code X-RateLimit-Reset}
 * response headers.
 * <p>
 * The health-check endpoint ({@code /api/ai/health}) is excluded from rate limiting
 * — see {@link com.diaryproject.backend.common.config.WebMvcConfig}.
 */
@Component
public class RateLimitInterceptor implements HandlerInterceptor {

    private static final Logger log = LoggerFactory.getLogger(RateLimitInterceptor.class);

    private static final String ACTION = "ai_call";
    private static final int MAX_PER_WINDOW = 50;
    private static final Duration WINDOW = Duration.ofDays(1);

    private final RateLimitService rateLimitService;

    public RateLimitInterceptor(RateLimitService rateLimitService) {
        this.rateLimitService = rateLimitService;
    }

    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response,
                             Object handler) throws Exception {
        Long userId = (Long) request.getAttribute("userId");
        if (userId == null) {
            log.warn("userId not found in request attribute, skipping rate limit for {} {}",
                    request.getMethod(), request.getRequestURI());
            return true;
        }

        boolean allowed = rateLimitService.tryAcquire(userId, ACTION, MAX_PER_WINDOW, WINDOW);

        if (!allowed) {
            log.info("Rate limit exceeded for userId={} on {}", userId, request.getRequestURI());
            response.setStatus(429);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"code\":429,\"message\":\"今日AI调用次数已达上限（50次），请明天再试\"}");
            return false;
        }

        long remaining = rateLimitService.getRemaining(userId, ACTION, MAX_PER_WINDOW, WINDOW);
        long resetEpoch = LocalDate.now().plusDays(1)
                .atStartOfDay(ZoneId.systemDefault())
                .toEpochSecond();

        response.setHeader("X-RateLimit-Remaining", String.valueOf(remaining));
        response.setHeader("X-RateLimit-Reset", String.valueOf(resetEpoch));

        return true;
    }
}
