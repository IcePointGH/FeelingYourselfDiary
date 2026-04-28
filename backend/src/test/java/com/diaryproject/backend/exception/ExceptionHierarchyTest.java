package com.diaryproject.backend.exception;

import com.diaryproject.backend.common.exception.BadRequestException;
import com.diaryproject.backend.common.exception.BusinessException;
import com.diaryproject.backend.common.exception.ConflictException;
import com.diaryproject.backend.common.exception.ResourceNotFoundException;
import com.diaryproject.backend.common.exception.UnauthorizedException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ExceptionHierarchyTest {

    @Test
    void businessExceptionExtendsRuntimeException() {
        assertTrue(RuntimeException.class.isAssignableFrom(BusinessException.class));
    }

    @Test
    void resourceNotFoundExceptionExtendsBusinessException() {
        assertTrue(BusinessException.class.isAssignableFrom(ResourceNotFoundException.class));
    }

    @Test
    void badRequestExceptionExtendsBusinessException() {
        assertTrue(BusinessException.class.isAssignableFrom(BadRequestException.class));
    }

    @Test
    void unauthorizedExceptionExtendsBusinessException() {
        assertTrue(BusinessException.class.isAssignableFrom(UnauthorizedException.class));
    }

    @Test
    void conflictExceptionExtendsBusinessException() {
        assertTrue(BusinessException.class.isAssignableFrom(ConflictException.class));
    }

    @Test
    void businessExceptionMessagePassing() {
        BusinessException ex = new BusinessException("test message");
        assertEquals("test message", ex.getMessage());
    }

    @Test
    void businessExceptionCauseChaining() {
        Throwable cause = new IllegalArgumentException("root cause");
        BusinessException ex = new BusinessException("wrapper", cause);
        assertEquals("wrapper", ex.getMessage());
        assertEquals(cause, ex.getCause());
    }

    @Test
    void resourceNotFoundExceptionMessagePassing() {
        ResourceNotFoundException ex = new ResourceNotFoundException("item not found");
        assertEquals("item not found", ex.getMessage());
        assertInstanceOf(BusinessException.class, ex);
    }

    @Test
    void resourceNotFoundWithResourceAndId() {
        ResourceNotFoundException ex = new ResourceNotFoundException("User", 42L);
        assertEquals("User 不存在: 42", ex.getMessage());
        assertInstanceOf(BusinessException.class, ex);
    }

    @Test
    void badRequestExceptionMessagePassing() {
        BadRequestException ex = new BadRequestException("bad input");
        assertEquals("bad input", ex.getMessage());
    }

    @Test
    void unauthorizedExceptionMessagePassing() {
        UnauthorizedException ex = new UnauthorizedException("no permission");
        assertEquals("no permission", ex.getMessage());
    }

    @Test
    void conflictExceptionMessagePassing() {
        ConflictException ex = new ConflictException("duplicate");
        assertEquals("duplicate", ex.getMessage());
    }
}
