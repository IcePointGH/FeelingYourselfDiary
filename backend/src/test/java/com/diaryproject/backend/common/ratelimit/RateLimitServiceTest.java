package com.diaryproject.backend.common.ratelimit;

import org.junit.jupiter.api.Test;
import org.redisson.api.RAtomicLong;
import org.redisson.api.RScript;
import org.redisson.api.RedissonClient;

import java.time.Duration;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link RateLimitServiceImpl}.
 * <p>
 * Pure Mockito — no Spring context, no {@code @ExtendWith}, no {@code @MockBean}.
 */
class RateLimitServiceTest {

    @Test
    @SuppressWarnings("unchecked")
    void tryAcquire_returnsTrue_onFirstCall() {
        RedissonClient redissonClient = mock(RedissonClient.class);
        RScript script = mock(RScript.class);
        RAtomicLong counter = mock(RAtomicLong.class);

        when(redissonClient.getScript()).thenReturn(script);
        when(redissonClient.getAtomicLong(anyString())).thenReturn(counter);
        when(counter.get()).thenReturn(1L);
        when(script.eval(
                any(RScript.Mode.class),
                anyString(),
                any(RScript.ReturnType.class),
                anyList(),
                anyLong()
        )).thenReturn(1L);

        RateLimitService service = new RateLimitServiceImpl(redissonClient);
        Long userId = 1L;
        String action = "login";
        int maxPerWindow = 50;
        Duration window = Duration.ofDays(1);

        assertTrue(service.tryAcquire(userId, action, maxPerWindow, window));
        assertEquals(maxPerWindow - 1, service.getRemaining(userId, action, maxPerWindow, window));
    }

    @Test
    @SuppressWarnings("unchecked")
    void tryAcquire_returnsFalse_whenAtLimit() {
        RedissonClient redissonClient = mock(RedissonClient.class);
        RScript script = mock(RScript.class);

        when(redissonClient.getScript()).thenReturn(script);
        when(script.eval(
                any(RScript.Mode.class),
                anyString(),
                any(RScript.ReturnType.class),
                anyList(),
                anyLong()
        )).thenReturn(51L);

        RateLimitService service = new RateLimitServiceImpl(redissonClient);

        assertFalse(service.tryAcquire(1L, "login", 50, Duration.ofDays(1)));
    }

    @Test
    void getRemaining_returnsZero_whenExceeded() {
        RedissonClient redissonClient = mock(RedissonClient.class);
        RAtomicLong counter = mock(RAtomicLong.class);

        when(redissonClient.getAtomicLong(anyString())).thenReturn(counter);
        when(counter.get()).thenReturn(55L);

        RateLimitService service = new RateLimitServiceImpl(redissonClient);

        assertEquals(0, service.getRemaining(1L, "login", 50, Duration.ofDays(1)));
    }

    @Test
    @SuppressWarnings("unchecked")
    void tryAcquire_independentActions_differentCounters() {
        RedissonClient redissonClient = mock(RedissonClient.class);
        RScript script = mock(RScript.class);
        RAtomicLong chatCounter = mock(RAtomicLong.class);
        RAtomicLong analyzeCounter = mock(RAtomicLong.class);

        when(redissonClient.getScript()).thenReturn(script);
        when(redissonClient.getAtomicLong(argThat((String key) -> key != null && key.contains("ai_chat"))))
                .thenReturn(chatCounter);
        when(redissonClient.getAtomicLong(argThat((String key) -> key != null && key.contains("ai_analyze"))))
                .thenReturn(analyzeCounter);

        // "ai_chat" is at limit (51 > 50)
        when(script.eval(
                any(RScript.Mode.class),
                anyString(),
                any(RScript.ReturnType.class),
                argThat((List<Object> keys) -> keys != null && !keys.isEmpty()
                        && ((String) keys.get(0)).contains("ai_chat")),
                anyLong()
        )).thenReturn(51L);

        // "ai_analyze" is within limit (1 <= 50)
        when(script.eval(
                any(RScript.Mode.class),
                anyString(),
                any(RScript.ReturnType.class),
                argThat((List<Object> keys) -> keys != null && !keys.isEmpty()
                        && ((String) keys.get(0)).contains("ai_analyze")),
                anyLong()
        )).thenReturn(1L);

        // getRemaining for both actions
        when(chatCounter.get()).thenReturn(51L);
        when(analyzeCounter.get()).thenReturn(1L);

        RateLimitService service = new RateLimitServiceImpl(redissonClient);
        Duration window = Duration.ofDays(1);

        // ai_chat at limit → blocked
        assertFalse(service.tryAcquire(1L, "ai_chat", 50, window));
        assertEquals(0, service.getRemaining(1L, "ai_chat", 50, window));

        // ai_analyze still available → allowed
        assertTrue(service.tryAcquire(1L, "ai_analyze", 50, window));
        assertEquals(49, service.getRemaining(1L, "ai_analyze", 50, window));
    }

    @Test
    void tryAcquire_returnsTrue_whenRedisThrows() {
        RedissonClient redissonClient = mock(RedissonClient.class);
        when(redissonClient.getAtomicLong(anyString())).thenThrow(new RuntimeException("Redis unavailable"));

        RateLimitService service = new RateLimitServiceImpl(redissonClient);

        int maxPerWindow = 50;
        assertTrue(service.tryAcquire(1L, "login", maxPerWindow, Duration.ofDays(1)));
        assertEquals(maxPerWindow, service.getRemaining(1L, "login", maxPerWindow, Duration.ofDays(1)));
    }
}
