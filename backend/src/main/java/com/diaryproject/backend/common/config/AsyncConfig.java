package com.diaryproject.backend.common.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * Async execution configuration for the application.
 * <p>
 * Provides a dedicated thread pool for long-running AI analysis tasks
 * (Mode 3 — Full History Analysis), so background analysis doesn't
 * compete with the main request-processing threads.</p>
 *
 * <p>Thread pool size is deliberately small (2) to avoid overwhelming
 * the MiniMax API or database connection pool during analysis.</p>
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    private static final Logger log = LoggerFactory.getLogger(AsyncConfig.class);

    /**
     * Executor for AI full-history analysis tasks.
     * Core pool size = 2, max pool size = 2, queue capacity = 10.
     */
    @Bean("aiTaskExecutor")
    public Executor aiTaskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(2);
        executor.setQueueCapacity(10);
        executor.setThreadNamePrefix("ai-analysis-");
        executor.initialize();
        log.info("aiTaskExecutor initialized — corePoolSize=2, maxPoolSize=2, queueCapacity=10");
        return executor;
    }
}
