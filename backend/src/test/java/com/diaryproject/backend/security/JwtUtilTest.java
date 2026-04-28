package com.diaryproject.backend.security;

import com.diaryproject.backend.common.security.JwtUtil;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for JwtUtil.validateSecret().
 * Uses reflection to set private fields since @PostConstruct won't run in unit tests.
 */
class JwtUtilTest {

    @Test
    void validateSecret_throwsWhenSecretIsNull() throws Exception {
        JwtUtil util = new JwtUtil();
        Field field = JwtUtil.class.getDeclaredField("jwtSecret");
        field.setAccessible(true);
        field.set(util, null);

        assertThrows(IllegalStateException.class, util::validateSecret);
    }

    @Test
    void validateSecret_throwsWhenSecretTooShort() throws Exception {
        JwtUtil util = new JwtUtil();
        Field field = JwtUtil.class.getDeclaredField("jwtSecret");
        field.setAccessible(true);
        field.set(util, "short");

        assertThrows(IllegalStateException.class, util::validateSecret);
    }

    @Test
    void validateSecret_succeedsWhenSecretIsLongEnough() throws Exception {
        JwtUtil util = new JwtUtil();
        Field field = JwtUtil.class.getDeclaredField("jwtSecret");
        field.setAccessible(true);
        field.set(util, "a".repeat(32));

        assertDoesNotThrow(util::validateSecret);
    }
}
