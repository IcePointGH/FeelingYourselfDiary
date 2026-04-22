package com.diaryproject.backend.common.log;

import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.LayoutBase;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 自定义 SQL 日志转换器，将 Hibernate 原始 SQL 转换为结构化格式
 * 原始: Hibernate: insert into users (avatar, created_at, ...) values (..., ..., ...)
 * 转换: [DB] INSERT users
 */
public class SqlLogConverter extends LayoutBase<ILoggingEvent> {

    private static final Pattern SQL_PATTERN = Pattern.compile(
            "(?i)\\s*(select|insert|update|delete)\\s+into\\s+([\\w_]+)"
    );

    @Override
    public String doLayout(ILoggingEvent event) {
        String message = event.getMessage();

        // 提取表名和操作类型
        Matcher matcher = SQL_PATTERN.matcher(message);
        if (matcher.find()) {
            String operation = matcher.group(1).toUpperCase();
            String table = matcher.group(2);
            return "[DB] " + operation + " " + table + "\n";
        }

        // SELECT 语句特殊处理
        if (message.contains("select") && message.contains("from")) {
            return "[DB] SELECT\n";
        }

        return null;
    }
}