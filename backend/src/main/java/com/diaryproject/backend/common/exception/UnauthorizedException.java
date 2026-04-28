package com.diaryproject.backend.common.exception;

/**
 * 权限不足异常，HTTP 403。
 */
public class UnauthorizedException extends BusinessException {
    public UnauthorizedException(String message) {
        super(message);
    }
}
