package com.diaryproject.backend.ai.service;

import com.diaryproject.backend.ai.entity.AiMessage;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class AiConversationBuilder {

    public List<AiMessage> recentWindow(List<AiMessage> messages, int maxMessages) {
        if (messages.size() <= maxMessages) {
            return messages;
        }
        return messages.subList(messages.size() - maxMessages, messages.size());
    }

    public List<Message> buildChatMessages(String systemPrompt, List<AiMessage> contextMessages, String contextBlock) {
        List<Message> messages = new ArrayList<>();
        messages.add(new SystemMessage(systemPrompt));

        for (int i = 0; i < contextMessages.size(); i++) {
            AiMessage message = contextMessages.get(i);
            if ("user".equals(message.getRole())) {
                messages.add(new UserMessage(userContent(message, contextBlock, i == contextMessages.size() - 1)));
            } else if ("assistant".equals(message.getRole())) {
                messages.add(new AssistantMessage(message.getContent()));
            }
        }

        return messages;
    }

    public String buildTranscript(List<AiMessage> messages) {
        StringBuilder conversation = new StringBuilder();
        for (AiMessage message : messages) {
            String role = "user".equals(message.getRole()) ? "用户" : "小七";
            conversation.append("【").append(role).append("】").append(message.getContent()).append("\n");
        }
        return conversation.toString();
    }

    private String userContent(AiMessage message, String contextBlock, boolean isLatestMessage) {
        if (contextBlock != null && isLatestMessage) {
            return contextBlock + "\n\n---\n\n" + message.getContent();
        }
        return message.getContent();
    }
}
