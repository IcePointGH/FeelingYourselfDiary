package com.diaryproject.backend.common.config;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.redisson.api.RedissonClient;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;

import java.lang.reflect.Field;

import static org.junit.jupiter.api.Assertions.*;

class RedisConfigTest {

    @Test
    @Disabled("Requires running Redis — integration test, run manually when Redis is available")
    void redissonClient_shouldBeCreated_withDefaultConfig() throws Exception {
        RedisConfig config = new RedisConfig();

        setField(config, "redisHost", "localhost");
        setField(config, "redisPort", 6379);
        setField(config, "redisPassword", "redis123");

        RedissonClient client = config.redissonClient();
        assertNotNull(client);
        client.shutdown();
    }

    @Test
    @Disabled("Requires running Redis — integration test, run manually when Redis is available")
    void redissonClient_shouldHandlePassword_whenProvided() throws Exception {
        RedisConfig config = new RedisConfig();

        setField(config, "redisHost", "localhost");
        setField(config, "redisPort", 6379);
        setField(config, "redisPassword", "testpass");

        RedissonClient client = config.redissonClient();
        assertNotNull(client);
        client.shutdown();
    }

    @Test
    @Disabled("Requires running Redis — integration test, run manually when Redis is available")
    void cacheManager_shouldReturnRedissonCacheManager_whenRedissonClientProvided() throws Exception {
        RedisConfig config = new RedisConfig();

        setField(config, "redisHost", "localhost");
        setField(config, "redisPort", 6379);
        setField(config, "redisPassword", "redis123");

        RedissonClient client = config.redissonClient();
        CacheManager cacheManager = config.cacheManager(client);

        assertNotNull(cacheManager);
        assertTrue(cacheManager.getClass().getSimpleName().contains("Redisson"));
        client.shutdown();
    }

    @Test
    void backendApplication_shouldHaveEnableCachingAnnotation() throws Exception {
        Class<?> appClass = Class.forName("com.diaryproject.backend.BackendApplication");
        EnableCaching annotation = appClass.getAnnotation(EnableCaching.class);
        assertNotNull(annotation, "BackendApplication should be annotated with @EnableCaching");
    }

    private void setField(Object target, String fieldName, Object value) throws Exception {
        Field field = target.getClass().getDeclaredField(fieldName);
        field.setAccessible(true);
        field.set(target, value);
    }
}
