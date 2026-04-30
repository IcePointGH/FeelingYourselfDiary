package com.diaryproject.backend.common.cache;

import java.time.LocalDate;

/**
 * Static factory methods for building Redis cache keys.
 * <p>
 * This is a utility class — not intended to be instantiated.
 */
public final class CacheKeys {

    private CacheKeys() {
        throw new UnsupportedOperationException("Utility class — cannot be instantiated");
    }

    /**
     * Redis key for a blacklisted token.
     *
     * @param jti the JWT identifier (unique token ID)
     * @return formatted cache key
     */
    public static String tokenBlacklist(String jti) {
        return CacheConstants.TOKEN_BLACKLIST_PREFIX + jti;
    }

    /**
     * Redis key for a cached user entity.
     * <p>
     * <b>Note:</b> This key format is for direct {@link CacheService} usage.
     * Spring {@code @Cacheable(value="user")} uses a different separator ({@code user::id}),
     * so this method must NOT be used interchangeably with Spring Cache annotations.
     *
     * @param userId the user's primary key
     * @return formatted cache key
     */
    public static String user(Long userId) {
        return "user:" + userId;
    }

    /**
     * Redis key for cached {@code UserDetails} used during authentication.
     * <p>
     * <b>Note:</b> Same separator warning as {@link #user(Long)}.
     *
     * @param username the user's login name
     * @return formatted cache key
     */
    public static String userDetails(String username) {
        return "userDetails:" + username;
    }

    /**
     * Redis key for a cached daily analysis result.
     *
     * @param userId the user's primary key
     * @param date   the analysis date
     * @return formatted cache key
     */
    public static String analysisDaily(Long userId, LocalDate date) {
        return "analysis:daily:" + userId + ":" + date;
    }

    /**
     * Redis key for a cached weekly analysis result.
     *
     * @param userId the user's primary key
     * @param date   any date within the target week
     * @return formatted cache key
     */
    public static String analysisWeekly(Long userId, LocalDate date) {
        return "analysis:weekly:" + userId + ":" + date;
    }

    /**
     * Redis key for a cached monthly analysis result.
     *
     * @param userId the user's primary key
     * @param date   any date within the target month
     * @return formatted cache key
     */
    public static String analysisMonthly(Long userId, LocalDate date) {
        return "analysis:monthly:" + userId + ":" + date;
    }

    /**
     * Redis key for cached schedule entries for a specific date.
     *
     * @param userId the user's primary key
     * @param date   the schedule date
     * @return formatted cache key
     */
    public static String scheduleDate(Long userId, LocalDate date) {
        return "schedules:date:" + userId + ":" + date;
    }

    /**
     * Glob-style pattern matching all analysis cache entries for a user.
     * <p>
     * Used with {@code evictByPattern()} when schedule data changes.
     *
     * @param userId the user's primary key
     * @return glob pattern
     */
    public static String analysisPattern(Long userId) {
        return "analysis:*:" + userId + ":*";
    }

    /**
     * Glob-style pattern matching all schedule cache entries for a user.
     *
     * @param userId the user's primary key
     * @return glob pattern
     */
    public static String schedulesPattern(Long userId) {
        return "schedules:*:" + userId + ":*";
    }

    /**
     * Redis key for cached diary entries for a specific date.
     *
     * @param userId the user's primary key
     * @param date   the diary date
     * @return formatted cache key
     */
    public static String diaryDate(Long userId, LocalDate date) {
        return "diaries:date:" + userId + ":" + date;
    }

    /**
     * Glob-style pattern matching all diary cache entries for a user.
     *
     * @param userId the user's primary key
     * @return glob pattern
     */
    public static String diaryPattern(Long userId) {
        return "diaries:*:" + userId + ":*";
    }

    /**
     * Redis key for cached user settings.
     *
     * @param userId the user's primary key
     * @return formatted cache key
     */
    public static String settings(Long userId) {
        return "settings:" + userId;
    }
}
