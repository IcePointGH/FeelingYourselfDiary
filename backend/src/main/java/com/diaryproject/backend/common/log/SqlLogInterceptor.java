package com.diaryproject.backend.common.log;

import org.hibernate.resource.jdbc.spi.StatementInspector;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Hibernate SQL 语句拦截器，用于记录结构化的数据库操作日志
 */
@Component
public class SqlLogInterceptor implements StatementInspector {

    private static final Logger log = LoggerFactory.getLogger("DB_SQL");
    private static final Pattern SELECT_PATTERN = Pattern.compile(
            "(?i)^\\s*select\\s+.*?\\s+from\\s+([\\w_]+)",
            Pattern.DOTALL
    );
    private static final Pattern INSERT_PATTERN = Pattern.compile(
            "(?i)^\\s*insert\\s+into\\s+([\\w_]+)",
            Pattern.DOTALL
    );
    private static final Pattern UPDATE_PATTERN = Pattern.compile(
            "(?i)^\\s*update\\s+([\\w_]+)",
            Pattern.DOTALL
    );
    private static final Pattern DELETE_PATTERN = Pattern.compile(
            "(?i)^\\s*delete\\s+from\\s+([\\w_]+)",
            Pattern.DOTALL
    );

    @Override
    public String inspect(String sql) {
        if (sql == null || sql.trim().isEmpty()) {
            return sql;
        }

        String[] parts = sql.trim().split("\\s+", 2);
        if (parts.length == 0) {
            return sql;
        }

        String operation = parts[0].toUpperCase();
        String table = extractTable(sql, operation);

        log.info("[DB] {}", operation + (table != null ? " " + table : ""));

        return sql;
    }

    private String extractTable(String sql, String operation) {
        Pattern pattern;
        switch (operation) {
            case "SELECT":
                pattern = SELECT_PATTERN;
                break;
            case "INSERT":
                pattern = INSERT_PATTERN;
                break;
            case "UPDATE":
                pattern = UPDATE_PATTERN;
                break;
            case "DELETE":
                pattern = DELETE_PATTERN;
                break;
            default:
                return null;
        }

        Matcher matcher = pattern.matcher(sql);
        if (matcher.find()) {
            return matcher.group(1);
        }
        return null;
    }
}