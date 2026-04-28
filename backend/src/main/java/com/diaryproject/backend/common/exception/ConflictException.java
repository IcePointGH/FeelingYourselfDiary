package com.diaryproject.backend.common.exception;

/**
 * 数据冲突异常（如用户名已存在），HTTP 409。
 */
public class ConflictException extends BusinessException {
    public ConflictException(String message) {
        super(message);
    }
}
