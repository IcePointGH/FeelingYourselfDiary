package com.diaryproject.backend.common.cache;

import org.redisson.api.RAtomicLong;
import org.redisson.api.RBucket;
import org.redisson.api.RedissonClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Optional;

/**
 * Redisson-backed implementation of {@link CacheService}.
 * <p>
 * Every method is guarded against Redis failures — exceptions are caught,
 * logged at WARN level, and a safe default is returned.
 */
@Component
@Primary
public class CacheServiceImpl implements CacheService {

    private static final Logger log = LoggerFactory.getLogger(CacheServiceImpl.class);

    private final RedissonClient redissonClient;

    public CacheServiceImpl(RedissonClient redissonClient) {
        this.redissonClient = redissonClient;
    }

    @Override
    public void blacklistToken(String jti, Duration ttl) {
        String key = CacheKeys.tokenBlacklist(jti);
        try {
            RBucket<Object> bucket = redissonClient.getBucket(key);
            bucket.set("blacklisted", ttl);
            log.debug("Token blacklisted: key={}, ttl={}", key, ttl);
        } catch (Exception e) {
            log.warn("Failed to blacklist token, key={}: {}", key, e.getMessage());
        }
    }

    @Override
    public boolean isTokenBlacklisted(String jti) {
        String key = CacheKeys.tokenBlacklist(jti);
        try {
            RBucket<Object> bucket = redissonClient.getBucket(key);
            return bucket.get() != null;
        } catch (Exception e) {
            log.warn("Failed to check token blacklist, key={}: {}", key, e.getMessage());
            return false;
        }
    }

    @Override
    public <T> Optional<T> get(String key, Class<T> type) {
        try {
            RBucket<Object> bucket = redissonClient.getBucket(key);
            Object value = bucket.get();
            if (value == null) {
                return Optional.empty();
            }
            return Optional.of(type.cast(value));
        } catch (Exception e) {
            log.warn("Failed to get cache entry, key={}: {}", key, e.getMessage());
            return Optional.empty();
        }
    }

    @Override
    public void put(String key, Object value, Duration ttl) {
        try {
            RBucket<Object> bucket = redissonClient.getBucket(key);
            bucket.set(value, ttl);
            log.debug("Cache put: key={}, ttl={}", key, ttl);
        } catch (Exception e) {
            log.warn("Failed to put cache entry, key={}: {}", key, e.getMessage());
        }
    }

    @Override
    public void evict(String key) {
        try {
            RBucket<Object> bucket = redissonClient.getBucket(key);
            bucket.delete();
            log.debug("Cache evicted: key={}", key);
        } catch (Exception e) {
            log.warn("Failed to evict cache entry, key={}: {}", key, e.getMessage());
        }
    }

    @Override
    public void evictByPattern(String pattern) {
        try {
            redissonClient.getKeys().deleteByPattern(pattern);
            log.debug("Cache evict by pattern: pattern={}", pattern);
        } catch (Exception e) {
            log.warn("Failed to evict cache entries by pattern, pattern={}: {}", pattern, e.getMessage());
        }
    }

    @Override
    public long increment(String key) {
        try {
            return redissonClient.getAtomicLong(key).incrementAndGet();
        } catch (Exception e) {
            log.warn("Failed to increment counter, key={}: {}", key, e.getMessage());
            return 0;
        }
    }
}
