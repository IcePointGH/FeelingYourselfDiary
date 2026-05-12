package com.diaryproject.backend.common.ratelimit;

import org.redisson.api.RAtomicLong;
import org.redisson.api.RScript;
import org.redisson.api.RedissonClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Collections;

/**
 * Redisson-backed implementation of {@link RateLimitService}.
 * <p>
 * Uses a Lua script for atomic INCR + EXPIRE on the counter key, and RAtomicLong
 * for reading the current count. Every method is guarded against Redis failures.
 */
@Component
public class RateLimitServiceImpl implements RateLimitService {

    private static final Logger log = LoggerFactory.getLogger(RateLimitServiceImpl.class);

    private static final String LUA_SCRIPT =
            "local current = redis.call('INCR', KEYS[1])\n" +
            "if current == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end\n" +
            "return current";

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE;

    private final RedissonClient redissonClient;

    public RateLimitServiceImpl(RedissonClient redissonClient) {
        this.redissonClient = redissonClient;
    }

    @Override
    public boolean tryAcquire(Long userId, String action, int maxPerWindow, Duration window) {
        try {
            String key = buildKey(userId, action, window);
            Long result = redissonClient.getScript().eval(
                    RScript.Mode.READ_WRITE,
                    LUA_SCRIPT,
                    RScript.ReturnType.LONG,
                    Collections.singletonList(key),
                    window.getSeconds()
            );
            return result <= maxPerWindow;
        } catch (Exception e) {
            log.warn("Failed to acquire rate limit: {}", e.getMessage());
            return true;
        }
    }

    @Override
    public long getRemaining(Long userId, String action, int maxPerWindow, Duration window) {
        try {
            String key = buildKey(userId, action, window);
            long value = redissonClient.getAtomicLong(key).get();
            return Math.max(0, maxPerWindow - value);
        } catch (Exception e) {
            log.warn("Failed to get rate limit remaining: {}", e.getMessage());
            return maxPerWindow;
        }
    }

    private String buildKey(Long userId, String action, Duration window) {
        String windowKey = LocalDate.now().format(DATE_FORMATTER);
        return "ratelimit:" + userId + ":" + action + ":" + windowKey;
    }
}
