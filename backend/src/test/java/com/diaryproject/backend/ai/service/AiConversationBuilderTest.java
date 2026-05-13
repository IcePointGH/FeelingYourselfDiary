package com.diaryproject.backend.ai.service;

import com.diaryproject.backend.ai.entity.AiMessage;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class AiConversationBuilderTest {

    private final AiConversationBuilder builder = new AiConversationBuilder();

    @Test
    void recentWindow_keepsLastFortyMessages() {
        List<AiMessage> messages = new ArrayList<>();
        for (int i = 1; i <= 45; i++) {
            messages.add(message("user", "m" + i, i));
        }

        List<AiMessage> result = builder.recentWindow(messages, 40);

        assertEquals(40, result.size());
        assertEquals("m6", result.get(0).getContent());
        assertEquals("m45", result.get(39).getContent());
    }

    @Test
    void buildChatMessages_injectsContextIntoLatestUserMessageOnly() {
        List<AiMessage> messages = List.of(
                message("user", "first", 1),
                message("assistant", "reply", 2),
                message("user", "latest", 3)
        );

        List<org.springframework.ai.chat.messages.Message> result =
                builder.buildChatMessages("system", messages, "context");

        assertInstanceOf(SystemMessage.class, result.get(0));
        assertInstanceOf(UserMessage.class, result.get(1));
        assertInstanceOf(AssistantMessage.class, result.get(2));
        assertInstanceOf(UserMessage.class, result.get(3));
        assertEquals("first", result.get(1).getText());
        assertEquals("context\n\n---\n\nlatest", result.get(3).getText());
    }

    @Test
    void buildTranscript_usesDiarySummaryRoles() {
        String result = builder.buildTranscript(List.of(
                message("user", "hello", 1),
                message("assistant", "hi", 2)
        ));

        assertEquals("【用户】hello\n【小七】hi\n", result);
    }

    private AiMessage message(String role, String content, int sequenceNum) {
        return AiMessage.builder()
                .sessionId(10L)
                .role(role)
                .content(content)
                .sequenceNum(sequenceNum)
                .build();
    }
}
