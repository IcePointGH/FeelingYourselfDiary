package com.diaryproject.backend.common.exception;

/**
 * 资源不存在异常，HTTP 404。
 */
public class ResourceNotFoundException extends BusinessException {
    public ResourceNotFoundException(String message) {
        super(message);
    }

    public ResourceNotFoundException(String resource, Object id) {
        super(resource + " 不存在: " + id);
    }
}
