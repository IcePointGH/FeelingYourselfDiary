package com.diaryproject.backend.common.cache;

import org.junit.jupiter.api.Test;
import org.redisson.api.RBucket;
import org.redisson.api.RedissonClient;
import org.redisson.api.RKeys;

import java.time.Duration;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link CacheServiceImpl}.
 * <p>
 * Pure Mockito — no Spring context, no {@code @ExtendWith}, no {@code @MockBean}.
 */
class CacheServiceTest {

    @Test
    void blacklistToken_setsBucketWithBlacklistedValue_whenCalled() {
        RedissonClient redissonClient = mock(RedissonClient.class);
        @SuppressWarnings("unchecked")
        RBucket<Object> bucket = mock(RBucket.class);
        when(redissonClient.getBucket("token:blacklist:test-jti")).thenReturn(bucket);

        CacheService service = new CacheServiceImpl(redissonClient);
        service.blacklistToken("test-jti", Duration.ofMinutes(30));

        verify(bucket).set("blacklisted", Duration.ofMinutes(30));
    }

    @Test
    void isTokenBlacklisted_returnsTrue_whenBucketHasValue() {
        RedissonClient redissonClient = mock(RedissonClient.class);
        @SuppressWarnings("unchecked")
        RBucket<Object> bucket = mock(RBucket.class);
        when(redissonClient.getBucket("token:blacklist:test-jti")).thenReturn(bucket);
        when(bucket.get()).thenReturn("blacklisted");

        CacheService service = new CacheServiceImpl(redissonClient);

        assertTrue(service.isTokenBlacklisted("test-jti"));
    }

    @Test
    void isTokenBlacklisted_returnsFalse_whenBucketIsNull() {
        RedissonClient redissonClient = mock(RedissonClient.class);
        @SuppressWarnings("unchecked")
        RBucket<Object> bucket = mock(RBucket.class);
        when(redissonClient.getBucket("token:blacklist:test-jti")).thenReturn(bucket);
        when(bucket.get()).thenReturn(null);

        CacheService service = new CacheServiceImpl(redissonClient);

        assertFalse(service.isTokenBlacklisted("test-jti"));
    }

    @Test
    void isTokenBlacklisted_returnsFalse_whenRedissonThrowsException() {
        RedissonClient redissonClient = mock(RedissonClient.class);
        when(redissonClient.getBucket(anyString())).thenThrow(new RuntimeException("Redis unavailable"));

        CacheService service = new CacheServiceImpl(redissonClient);

        assertFalse(service.isTokenBlacklisted("any-jti"));
    }

    @Test
    void get_returnsOptionalOfValue_whenBucketHasValue() {
        RedissonClient redissonClient = mock(RedissonClient.class);
        @SuppressWarnings("unchecked")
        RBucket<Object> bucket = mock(RBucket.class);
        when(redissonClient.getBucket("user:1")).thenReturn(bucket);
        when(bucket.get()).thenReturn("cached-user");

        CacheService service = new CacheServiceImpl(redissonClient);
        Optional<String> result = service.get("user:1", String.class);

        assertTrue(result.isPresent());
        assertEquals("cached-user", result.get());
    }

    @Test
    void get_returnsOptionalEmpty_whenBucketIsNull() {
        RedissonClient redissonClient = mock(RedissonClient.class);
        @SuppressWarnings("unchecked")
        RBucket<Object> bucket = mock(RBucket.class);
        when(redissonClient.getBucket("user:1")).thenReturn(bucket);
        when(bucket.get()).thenReturn(null);

        CacheService service = new CacheServiceImpl(redissonClient);
        Optional<String> result = service.get("user:1", String.class);

        assertTrue(result.isEmpty());
    }

    @Test
    void get_returnsOptionalEmpty_whenRedissonThrowsException() {
        RedissonClient redissonClient = mock(RedissonClient.class);
        when(redissonClient.getBucket(anyString())).thenThrow(new RuntimeException("Redis unavailable"));

        CacheService service = new CacheServiceImpl(redissonClient);
        Optional<String> result = service.get("any-key", String.class);

        assertTrue(result.isEmpty());
    }

    @Test
    void put_callsBucketSetWithValueAndTtl() {
        RedissonClient redissonClient = mock(RedissonClient.class);
        @SuppressWarnings("unchecked")
        RBucket<Object> bucket = mock(RBucket.class);
        when(redissonClient.getBucket("my-key")).thenReturn(bucket);

        CacheService service = new CacheServiceImpl(redissonClient);
        service.put("my-key", "my-value", Duration.ofMinutes(10));

        verify(bucket).set("my-value", Duration.ofMinutes(10));
    }

    @Test
    void evict_callsBucketDelete() {
        RedissonClient redissonClient = mock(RedissonClient.class);
        @SuppressWarnings("unchecked")
        RBucket<Object> bucket = mock(RBucket.class);
        when(redissonClient.getBucket("my-key")).thenReturn(bucket);

        CacheService service = new CacheServiceImpl(redissonClient);
        service.evict("my-key");

        verify(bucket).delete();
    }

    @Test
    void evictByPattern_callsDeleteByPattern() {
        RedissonClient redissonClient = mock(RedissonClient.class);
        RKeys rKeys = mock(RKeys.class);
        when(redissonClient.getKeys()).thenReturn(rKeys);

        CacheService service = new CacheServiceImpl(redissonClient);
        service.evictByPattern("user:*");

        verify(rKeys).deleteByPattern("user:*");
    }

    @Test
    void evictByPattern_doesNotThrow_whenRedissonThrowsException() {
        RedissonClient redissonClient = mock(RedissonClient.class);
        when(redissonClient.getKeys()).thenThrow(new RuntimeException("Redis unavailable"));

        CacheService service = new CacheServiceImpl(redissonClient);

        assertDoesNotThrow(() -> service.evictByPattern("user:*"));
    }
}
