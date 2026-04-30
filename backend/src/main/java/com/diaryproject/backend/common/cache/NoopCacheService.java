package com.diaryproject.backend.common.cache;

import org.redisson.api.RedissonClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Optional;

/**
 * No-op cache service used as a fallback when Redis is unavailable.
 * <p>
 * All operations are safe no-ops — the application continues to function
 * without caching, fetching data directly from the database.
 */
@Component
@ConditionalOnMissingBean(RedissonClient.class)
public class NoopCacheService implements CacheService {

    private static final Logger log = LoggerFactory.getLogger(NoopCacheService.class);

    @Override
    public void blacklistToken(String jti, Duration ttl) {
        log.warn("Cache unavailable — token blacklist skipped for jti={}", jti);
    }

    @Override
    public boolean isTokenBlacklisted(String jti) {
        return false;
    }

    @Override
    public <T> Optional<T> get(String key, Class<T> type) {
        return Optional.empty();
    }

    @Override
    public void put(String key, Object value, Duration ttl) {
        // no-op
    }

    @Override
    public void evict(String key) {
        // no-op
    }

    @Override
    public void evictByPattern(String pattern) {
        // no-op
    }

    @Override
    public long increment(String key) {
        return 0;
    }
}
