package com.diaryproject.backend.ai.service;

import com.diaryproject.backend.ai.dto.AiDTO;
import com.diaryproject.backend.ai.entity.AiMessage;
import com.diaryproject.backend.ai.entity.AiSession;
import com.diaryproject.backend.ai.repository.AiMessageRepository;
import com.diaryproject.backend.ai.repository.AiSessionRepository;
import com.diaryproject.backend.common.exception.ResourceNotFoundException;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class AiDiarySummaryService {

    private final AiSessionRepository aiSessionRepository;
    private final AiMessageRepository aiMessageRepository;
    private final PromptService promptService;
    private final AiDiarySummaryParser diarySummaryParser;
    private final AiDiarySummaryWriter diarySummaryWriter;
    private final AiConversationBuilder conversationBuilder;
    private final ChatClient chatClient;

    public AiDiarySummaryService(AiSessionRepository aiSessionRepository,
                                 AiMessageRepository aiMessageRepository,
                                 PromptService promptService,
                                 AiDiarySummaryParser diarySummaryParser,
                                 AiDiarySummaryWriter diarySummaryWriter,
                                 AiConversationBuilder conversationBuilder,
                                 ChatModel chatModel) {
        this.aiSessionRepository = aiSessionRepository;
        this.aiMessageRepository = aiMessageRepository;
        this.promptService = promptService;
        this.diarySummaryParser = diarySummaryParser;
        this.diarySummaryWriter = diarySummaryWriter;
        this.conversationBuilder = conversationBuilder;
        this.chatClient = ChatClient.builder(chatModel).build();
    }

    @Transactional
    public AiDTO.SummarizeResponse summarizeToDiary(Long userId, Long sessionId) {
        AiSession session = aiSessionRepository
                .findByUserIdAndId(userId, sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("AI session", sessionId));

        List<AiMessage> messages = aiMessageRepository.findBySessionIdOrderBySequenceNumAsc(sessionId);
        if (messages.isEmpty()) {
            throw new IllegalArgumentException("Cannot summarize an empty AI session");
        }

        String aiResponse = requestDiarySummary(messages);
        AiDiarySummaryParser.ParsedSummary parsedSummary = diarySummaryParser.parse(aiResponse);
        AiDiarySummaryWriter.Result writeResult = diarySummaryWriter.write(
                userId,
                session,
                parsedSummary.title(),
                parsedSummary.content(),
                LocalDate.now()
        );

        AiDTO.SummarizeResponse response = new AiDTO.SummarizeResponse();
        response.setDiaryId(writeResult.diaryId());
        response.setDiaryDate(writeResult.diaryDate().toString());
        response.setUpdated(writeResult.updated());
        return response;
    }

    private String requestDiarySummary(List<AiMessage> messages) {
        String conversation = conversationBuilder.buildTranscript(messages);
        String systemPrompt = promptService.get("summarize-conversation");
        String aiResponse = chatClient.prompt()
                .system(systemPrompt)
                .user(conversation)
                .call()
                .chatResponse()
                .getResult()
                .getOutput()
                .getText();

        if (aiResponse == null || aiResponse.isBlank()) {
            throw new IllegalStateException("AI summary failed, please retry later");
        }
        return aiResponse;
    }
}
