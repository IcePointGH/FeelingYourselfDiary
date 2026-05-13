package com.diaryproject.backend.ai.service;

import com.diaryproject.backend.ai.entity.UserMemory;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.*;

class AiChatSystemPromptBuilderTest {

    @Test
    void build_injectsUserMemoryWhenPresent() {
        MemoryService memoryService = mock(MemoryService.class);
        UserMemory memory = UserMemory.builder().userId(1L).content("偏好晨间散步").build();
        when(memoryService.getOrCreate(1L)).thenReturn(memory);

        String result = new AiChatSystemPromptBuilder(memoryService).build(1L);

        assertTrue(result.contains("你是一个温暖而专业的情绪平衡助手"));
        assertTrue(result.contains("## 关于用户（基于历史对话分析）"));
        assertTrue(result.contains("偏好晨间散步"));
    }

    @Test
    void build_usesBasePromptWhenMemoryIsBlank() {
        MemoryService memoryService = mock(MemoryService.class);
        when(memoryService.getOrCreate(1L)).thenReturn(UserMemory.builder().userId(1L).content(" ").build());

        String result = new AiChatSystemPromptBuilder(memoryService).build(1L);

        assertFalse(result.contains("## 关于用户"));
    }

    @Test
    void build_usesBasePromptWhenMemoryLookupFails() {
        MemoryService memoryService = mock(MemoryService.class);
        when(memoryService.getOrCreate(1L)).thenThrow(new RuntimeException("redis unavailable"));

        String result = new AiChatSystemPromptBuilder(memoryService).build(1L);

        assertTrue(result.contains("你是一个温暖而专业的情绪平衡助手"));
        assertFalse(result.contains("## 关于用户"));
    }
}
