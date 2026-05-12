package com.diaryproject.backend.common.ratelimit;

import java.time.Duration;

/**
 * Abstraction for Redis-backed rate limiting operations.
 * <p>
 * Implementations are expected to be resilient — Redis unavailability
 * must never propagate to callers.
 */
public interface RateLimitService {

    /**
     * Try to acquire a permit for the given action within the time window.
     *
     * @param userId       the user attempting the action
     * @param action       the action being rate-limited (e.g. "login", "ai_chat")
     * @param maxPerWindow maximum permitted calls within the window
     * @param window       the time window duration
     * @return {@code true} if the call is allowed, {@code false} if rate-limited
     */
    boolean tryAcquire(Long userId, String action, int maxPerWindow, Duration window);

    /**
     * Get the remaining number of calls available for the given action within the
     * time window.
     *
     * @param userId       the user
     * @param action       the action being rate-limited
     * @param maxPerWindow maximum permitted calls within the window
     * @param window       the time window duration
     * @return the number of remaining calls, or 0 if the limit has been exceeded
     */
    long getRemaining(Long userId, String action, int maxPerWindow, Duration window);
}
