package com.diaryproject.backend.ai.exception;

import com.diaryproject.backend.common.exception.BusinessException;

/**
 * AI 结构化报告解析/校验失败异常。
 * Controller 层捕获后返回 422 + "AI_STRUCTURED_REPORT_INVALID"。
 */
public class StructuredReportException extends BusinessException {
    public StructuredReportException(String message) {
        super(message);
    }

    public StructuredReportException(String message, Throwable cause) {
        super(message, cause);
    }
}
