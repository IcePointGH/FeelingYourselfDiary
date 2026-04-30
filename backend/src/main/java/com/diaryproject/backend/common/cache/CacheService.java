package com.diaryproject.backend.common.cache;

import java.time.Duration;
import java.util.Optional;

/**
 * Abstraction for Redis-backed caching operations.
 * <p>
 * Implementations are expected to be resilient — Redis unavailability
 * must never propagate to callers.
 */
public interface CacheService {

    /**
     * Add a JWT identifier to the token blacklist.
     *
     * @param jti the JWT identifier to blacklist
     * @param ttl how long the blacklist entry should live
     */
    void blacklistToken(String jti, Duration ttl);

    /**
     * Check whether a JWT identifier has been blacklisted.
     *
     * @param jti the JWT identifier to check
     * @return {@code true} if the token is blacklisted, {@code false} otherwise
     */
    boolean isTokenBlacklisted(String jti);

    /**
     * Retrieve a value from the cache by key.
     *
     * @param key  the Redis key
     * @param type the expected value type
     * @param <T>  the value type
     * @return an {@link Optional} containing the value, or empty if absent or on error
     */
    <T> Optional<T> get(String key, Class<T> type);

    /**
     * Store a value in the cache with a given TTL.
     *
     * @param key   the Redis key
     * @param value the value to store
     * @param ttl   time-to-live duration
     */
    void put(String key, Object value, Duration ttl);

    /**
     * Remove a single entry from the cache.
     *
     * @param key the Redis key to evict
     */
    void evict(String key);

    /**
     * Remove all cache entries whose keys match the given glob-style pattern.
     *
     * @param pattern the key pattern (e.g. {@code "user:*"})
     */
    void evictByPattern(String pattern);

    /**
     * Atomically increment a counter stored at the given key.
     * <p>
     * Used for token version counters and other numeric cache values.
     *
     * @param key the Redis key
     * @return the incremented value, or 0 on error
     */
    long increment(String key);
}
