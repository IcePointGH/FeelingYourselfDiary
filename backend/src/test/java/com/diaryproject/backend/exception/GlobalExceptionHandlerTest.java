package com.diaryproject.backend.exception;

import com.diaryproject.backend.common.dto.ApiResponse;
import com.diaryproject.backend.common.exception.BusinessException;
import com.diaryproject.backend.common.exception.ConflictException;
import com.diaryproject.backend.common.exception.GlobalExceptionHandler;
import com.diaryproject.backend.common.exception.ResourceNotFoundException;
import com.diaryproject.backend.common.exception.UnauthorizedException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpInputMessage;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void handleResourceNotFoundReturns404() {
        ResourceNotFoundException ex = new ResourceNotFoundException("User not found");
        ResponseEntity<ApiResponse<Void>> resp = handler.handleResourceNotFound(ex);
        assertEquals(HttpStatus.NOT_FOUND, resp.getStatusCode());
        assertNotNull(resp.getBody());
        assertEquals("User not found", resp.getBody().getMessage());
        assertEquals(404, resp.getBody().getCode());
    }

    @Test
    void handleUnauthorizedReturns403() {
        UnauthorizedException ex = new UnauthorizedException("no access");
        ResponseEntity<ApiResponse<Void>> resp = handler.handleUnauthorized(ex);
        assertEquals(HttpStatus.FORBIDDEN, resp.getStatusCode());
        assertNotNull(resp.getBody());
        assertEquals("no access", resp.getBody().getMessage());
        assertEquals(403, resp.getBody().getCode());
    }

    @Test
    void handleBusinessExceptionReturns400() {
        BusinessException ex = new BusinessException("bad business");
        ResponseEntity<ApiResponse<Void>> resp = handler.handleBusinessException(ex);
        assertEquals(HttpStatus.BAD_REQUEST, resp.getStatusCode());
        assertNotNull(resp.getBody());
        assertEquals("bad business", resp.getBody().getMessage());
        assertEquals(400, resp.getBody().getCode());
    }

    @Test
    void handleConflictReturns409() {
        ConflictException ex = new ConflictException("duplicate record");
        ResponseEntity<ApiResponse<Void>> resp = handler.handleConflict(ex);
        assertEquals(HttpStatus.CONFLICT, resp.getStatusCode());
        assertNotNull(resp.getBody());
        assertEquals("duplicate record", resp.getBody().getMessage());
        assertEquals(409, resp.getBody().getCode());
    }

    @Test
    void handleValidationReturns400WithFieldInfo() {
        MethodArgumentNotValidException ex = mock(MethodArgumentNotValidException.class);
        BindingResult bindingResult = mock(BindingResult.class);
        FieldError fieldError = new FieldError("createRequest", "title", "标题不能为空");
        when(bindingResult.getFieldErrors()).thenReturn(List.of(fieldError));
        when(ex.getBindingResult()).thenReturn(bindingResult);

        ResponseEntity<ApiResponse<Void>> resp = handler.handleValidation(ex);
        assertEquals(HttpStatus.BAD_REQUEST, resp.getStatusCode());
        assertNotNull(resp.getBody());
        assertEquals(400, resp.getBody().getCode());
        assertTrue(resp.getBody().getMessage().contains("title"));
        assertTrue(resp.getBody().getMessage().contains("标题不能为空"));
    }

    @Test
    void handleBadCredentialsReturns401() {
        BadCredentialsException ex = new BadCredentialsException("bad creds");
        ResponseEntity<ApiResponse<Void>> resp = handler.handleBadCredentials(ex);
        assertEquals(HttpStatus.UNAUTHORIZED, resp.getStatusCode());
        assertNotNull(resp.getBody());
        assertEquals("用户名或密码错误", resp.getBody().getMessage());
        assertEquals(401, resp.getBody().getCode());
    }

    @Test
    void handleRuntimeExceptionReturns400() {
        RuntimeException ex = new RuntimeException("runtime error");
        ResponseEntity<ApiResponse<Void>> resp = handler.handleRuntimeException(ex);
        assertEquals(HttpStatus.BAD_REQUEST, resp.getStatusCode());
        assertNotNull(resp.getBody());
        assertEquals("runtime error", resp.getBody().getMessage());
    }

    @Test
    void handleExceptionReturns500() {
        Exception ex = new Exception("internal error");
        ResponseEntity<ApiResponse<Void>> resp = handler.handleException(ex);
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, resp.getStatusCode());
        assertNotNull(resp.getBody());
        assertEquals("服务器内部错误", resp.getBody().getMessage());
    }

    @Test
    void handleAccessDeniedReturns403() {
        AccessDeniedException ex = new AccessDeniedException("access denied");
        ResponseEntity<ApiResponse<Void>> resp = handler.handleAccessDenied(ex);
        assertEquals(HttpStatus.FORBIDDEN, resp.getStatusCode());
        assertNotNull(resp.getBody());
        assertEquals(403, resp.getBody().getCode());
        assertEquals("权限不足", resp.getBody().getMessage());
    }

    @Test
    void handleDataIntegrityReturns409() {
        DataIntegrityViolationException ex = new DataIntegrityViolationException("duplicate key");
        ResponseEntity<ApiResponse<Void>> resp = handler.handleDataIntegrity(ex);
        assertEquals(HttpStatus.CONFLICT, resp.getStatusCode());
        assertNotNull(resp.getBody());
        assertEquals(409, resp.getBody().getCode());
        assertEquals("数据冲突，请重试", resp.getBody().getMessage());
    }

    @Test
    void handleMessageNotReadableReturns400() {
        HttpInputMessage mockInput = mock(HttpInputMessage.class);
        HttpMessageNotReadableException ex = new HttpMessageNotReadableException("invalid json", mockInput);
        ResponseEntity<ApiResponse<Void>> resp = handler.handleMessageNotReadable(ex);
        assertEquals(HttpStatus.BAD_REQUEST, resp.getStatusCode());
        assertNotNull(resp.getBody());
        assertEquals(400, resp.getBody().getCode());
        assertEquals("请求格式错误", resp.getBody().getMessage());
    }

    @Test
    void handleMethodNotSupportedReturns405() {
        HttpRequestMethodNotSupportedException ex = new HttpRequestMethodNotSupportedException("POST", List.of("GET"));
        ResponseEntity<ApiResponse<Void>> resp = handler.handleMethodNotSupported(ex);
        assertEquals(HttpStatus.METHOD_NOT_ALLOWED, resp.getStatusCode());
        assertNotNull(resp.getBody());
        assertEquals(405, resp.getBody().getCode());
        assertEquals("不支持的请求方法", resp.getBody().getMessage());
    }
}
