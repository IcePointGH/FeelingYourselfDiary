package com.diaryproject.backend.ai.service;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

/**
 * 提示词加载服务 — 在启动时将 classpath:prompts/*.md 文件加载到内存缓存中。
 * <p>
 * 所有 AI 服务通过 {@link #get(String)} 按文件名（不含 .md 后缀）获取提示词。
 * 文件缺失时记录警告并返回内置兜底字符串。
 * </p>
 */
@Service
public class PromptService {

    private static final Logger log = LoggerFactory.getLogger(PromptService.class);

    private final Map<String, String> prompts = new HashMap<>();

    private static final Map<String, String> FALLBACKS = new HashMap<>();

    static {
        FALLBACKS.put("_base-role",
                "你是一个温暖而专业的情绪平衡助手，名字叫\"小七\"。\n"
                + "核心原则：只基于提供的数据说话，绝不捏造信息。语气温和亲切。永远不要给出医疗建议或诊断。");
        FALLBACKS.put("chat-system",
                "结尾加上：\"以上分析由AI生成，仅供参考 ❤️\"");
        FALLBACKS.put("range-analysis",
                "请根据以下日程数据分析用户的情绪状态。");
        FALLBACKS.put("range-analysis-json",
                "请根据数据输出严格JSON格式的情绪分析报告。");
        FALLBACKS.put("full-analysis",
                "请根据以下数据对用户的情绪状态进行全面分析。");
        FALLBACKS.put("title-generation",
                "用5-15个字总结以下对话的主题，只返回标题，不要其他内容。\n\n用户：{0}\n助手：{1}");
        FALLBACKS.put("memory-update", "你是一个情绪记录助手。");
        FALLBACKS.put("summarize-conversation",
                "请将以下对话总结为一篇简短日记。\n输出格式：\nTITLE: 标题\nCONTENT: 日记内容");
    }

    @PostConstruct
    void loadPrompts() {
        PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
        try {
            Resource[] resources = resolver.getResources("classpath:prompts/*.md");
            for (Resource resource : resources) {
                String filename = resource.getFilename();
                if (filename == null) continue;
                String key = filename.endsWith(".md") ? filename.substring(0, filename.length() - 3) : filename;
                String content = resource.getContentAsString(StandardCharsets.UTF_8);
                prompts.put(key, content);
                log.info("Loaded prompt: {} ({} chars)", key, content.length());
            }
            log.info("PromptService initialized — loaded {} prompt(s)", prompts.size());
        } catch (IOException e) {
            log.error("Failed to load prompts from classpath:prompts/", e);
        }
    }

    /**
     * 获取指定名称的提示词。
     *
     * @param name 文件名（不含 .md 后缀）
     * @return 提示词文本，文件不存在时返回兜底字符串
     */
    public String get(String name) {
        String prompt = prompts.get(name);
        if (prompt == null) {
            String fallback = FALLBACKS.getOrDefault(name, "");
            log.warn("Prompt file not found for '{}', using fallback", name);
            return fallback;
        }
        return prompt;
    }

    /**
     * 获取指定名称的提示词，并在前面拼接公共角色定义（_base-role）。
     * <p>
     * 适用于需要"小七"角色的提示词（chat-system、range-analysis-json、full-analysis 等），
     * 避免在每个提示词文件中重复定义角色。
     * </p>
     *
     * @param name 文件名（不含 .md 后缀）
     * @return 公共角色定义 + 提示词文本
     */
    public String getWithBase(String name) {
        String base = get("_base-role");
        String specific = get(name);
        if (base == null || base.isBlank()) {
            return specific;
        }
        return base + "\n\n" + specific;
    }
}
