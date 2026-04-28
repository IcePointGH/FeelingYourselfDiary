package com.diaryproject.backend.common.exception;

/**
 * 请求参数错误异常，HTTP 400。
 */
public class BadRequestException extends BusinessException {
    public BadRequestException(String message) {
        super(message);
    }
}
