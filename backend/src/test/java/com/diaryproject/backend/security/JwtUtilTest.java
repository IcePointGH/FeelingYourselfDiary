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

    private void setField(JwtUtil util, String fieldName, Object value) throws Exception {
        Field field = JwtUtil.class.getDeclaredField(fieldName);
        field.setAccessible(true);
        field.set(util, value);
    }

    @Test
    void generateToken_shouldContainJtiClaim() throws Exception {
        JwtUtil util = new JwtUtil();
        setField(util, "jwtSecret", "abcdefghijklmnopqrstuvwxyzABCDEFGHIJ"); // 36 chars
        setField(util, "jwtExpiration", 3600000L); // 1 hour

        String token = util.generateToken(1L, "testuser");
        String jti = util.extractTokenId(token);

        assertNotNull(jti);
        assertFalse(jti.isEmpty());
    }

    @Test
    void generateToken_shouldHaveUniqueJtiPerToken() throws Exception {
        JwtUtil util = new JwtUtil();
        setField(util, "jwtSecret", "abcdefghijklmnopqrstuvwxyzABCDEFGHIJ"); // 36 chars
        setField(util, "jwtExpiration", 3600000L); // 1 hour

        String token1 = util.generateToken(1L, "user1");
        String token2 = util.generateToken(2L, "user2");

        String jti1 = util.extractTokenId(token1);
        String jti2 = util.extractTokenId(token2);

        assertNotNull(jti1);
        assertNotNull(jti2);
        assertNotEquals(jti1, jti2);
    }
}
