package com.diaryproject.backend.ai.service;

import com.diaryproject.backend.ai.dto.AiDTO;
import com.diaryproject.backend.ai.entity.AiMessage;
import com.diaryproject.backend.ai.entity.AiSession;
import com.diaryproject.backend.ai.repository.AiMessageRepository;
import com.diaryproject.backend.ai.repository.AiSessionRepository;
import com.diaryproject.backend.ai.repository.AiSessionScheduleRepository;
import com.diaryproject.backend.common.exception.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * AI 会话服务 — 管理 AI 对话会话的 CRUD 操作
 */
@Service
public class AiSessionService {

    private static final Logger log = LoggerFactory.getLogger(AiSessionService.class);

    private static final DateTimeFormatter DT_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final AiSessionRepository aiSessionRepository;
    private final AiMessageRepository aiMessageRepository;
    private final AiSessionScheduleRepository aiSessionScheduleRepository;

    public AiSessionService(AiSessionRepository aiSessionRepository,
                            AiMessageRepository aiMessageRepository,
                            AiSessionScheduleRepository aiSessionScheduleRepository) {
        this.aiSessionRepository = aiSessionRepository;
        this.aiMessageRepository = aiMessageRepository;
        this.aiSessionScheduleRepository = aiSessionScheduleRepository;
    }

    /**
     * 创建新会话
     */
    @Transactional
    public AiDTO.SessionResponse createSession(Long userId, AiDTO.CreateSessionRequest req) {
        AiSession session = AiSession.builder()
                .userId(userId)
                .sessionType(req.getSessionType())
                .title(req.getTitle())
                .status("active")
                .progress(0)
                .build();
        session = aiSessionRepository.save(session);
        log.info("AI 会话创建成功 — sessionId: {}, userId: {}, type: {}", session.getId(), userId, req.getSessionType());

        AiDTO.SessionResponse response = toSessionResponse(session, 0);
        response.setMessages(new ArrayList<>());
        return response;
    }

    /**
     * 获取用户的所有会话列表
     */
    @Transactional(readOnly = true)
    public List<AiDTO.SessionListItem> listUserSessions(Long userId) {
        List<AiSession> sessions = aiSessionRepository.findByUserIdOrderByUpdatedAtDesc(userId);
        return sessions.stream().map(s -> {
            int msgCount = aiMessageRepository.findBySessionIdOrderBySequenceNumAsc(s.getId()).size();
            AiDTO.SessionListItem item = new AiDTO.SessionListItem();
            item.setId(s.getId());
            item.setTitle(s.getTitle());
            item.setSessionType(s.getSessionType());
            item.setStatus(s.getStatus());
            item.setCreatedAt(s.getCreatedAt() != null ? s.getCreatedAt().format(DT_FMT) : null);
            item.setMessageCount(msgCount);
            return item;
        }).collect(Collectors.toList());
    }

    /**
     * 获取会话详情（包含消息列表）
     */
    @Transactional(readOnly = true)
    public AiDTO.SessionResponse getSessionDetail(Long userId, Long sessionId) {
        AiSession session = aiSessionRepository.findByUserIdAndId(userId, sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("AI 会话", sessionId));

        List<AiMessage> messages = aiMessageRepository.findBySessionIdOrderBySequenceNumAsc(sessionId);
        List<AiDTO.MessageResponse> messageResponses = messages.stream().map(this::toMessageResponse).collect(Collectors.toList());

        AiDTO.SessionResponse response = toSessionResponse(session, messageResponses.size());
        response.setMessages(messageResponses);
        return response;
    }

    /**
     * 删除会话（级联删除消息和关联数据）
     */
    @Transactional
    public void deleteSession(Long userId, Long sessionId) {
        AiSession session = aiSessionRepository.findByUserIdAndId(userId, sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("AI 会话", sessionId));

        // Delete associated schedules first
        List<com.diaryproject.backend.ai.entity.AiSessionSchedule> schedules =
                aiSessionScheduleRepository.findBySessionId(sessionId);
        if (!schedules.isEmpty()) {
            aiSessionScheduleRepository.deleteAll(schedules);
        }

        // Delete associated messages
        List<AiMessage> messages = aiMessageRepository.findBySessionIdOrderBySequenceNumAsc(sessionId);
        if (!messages.isEmpty()) {
            aiMessageRepository.deleteAll(messages);
        }

        // Delete the session itself
        aiSessionRepository.delete(session);
        log.info("AI 会话删除成功 — sessionId: {}, userId: {}", sessionId, userId);
    }

    /**
     * 删除单条消息（校验所属会话的归属权）
     */
    @Transactional
    public void deleteMessage(Long userId, Long messageId) {
        AiMessage message = aiMessageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("AI 消息", messageId));

        // Verify the message's session belongs to the current user
        aiSessionRepository.findByUserIdAndId(userId, message.getSessionId())
                .orElseThrow(() -> new ResourceNotFoundException("AI 会话", message.getSessionId()));

        aiMessageRepository.delete(message);
        log.info("AI 消息删除成功 — messageId: {}, sessionId: {}, userId: {}",
                messageId, message.getSessionId(), userId);
    }

    /**
     * 重命名会话
     */
    @Transactional
    public AiDTO.SessionResponse renameSession(Long userId, Long sessionId, String newTitle) {
        AiSession session = aiSessionRepository.findByUserIdAndId(userId, sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("AI 会话", sessionId));
        session.setTitle(newTitle);
        aiSessionRepository.save(session);
        log.info("AI 会话重命名 — sessionId: {}, newTitle: {}", sessionId, newTitle);

        int msgCount = aiMessageRepository.findBySessionIdOrderBySequenceNumAsc(sessionId).size();
        return toSessionResponse(session, msgCount);
    }

    private AiDTO.SessionResponse toSessionResponse(AiSession session, int messageCount) {
        AiDTO.SessionResponse response = new AiDTO.SessionResponse();
        response.setId(session.getId());
        response.setTitle(session.getTitle());
        response.setSessionType(session.getSessionType());
        response.setStatus(session.getStatus());
        response.setProgress(session.getProgress());
        response.setCreatedAt(session.getCreatedAt() != null ? session.getCreatedAt().format(DT_FMT) : null);
        response.setMessageCount(messageCount);
        return response;
    }

    private AiDTO.MessageResponse toMessageResponse(AiMessage msg) {
        AiDTO.MessageResponse response = new AiDTO.MessageResponse();
        response.setId(msg.getId());
        response.setRole(msg.getRole());
        response.setContent(msg.getContent());
        response.setSequenceNum(msg.getSequenceNum());
        response.setCreatedAt(msg.getCreatedAt() != null ? msg.getCreatedAt().format(DT_FMT) : null);
        return response;
    }
}
