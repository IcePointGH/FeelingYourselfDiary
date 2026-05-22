package com.diaryproject.backend.ai.repository;

import com.diaryproject.backend.ai.entity.AiMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AiMessageRepository extends JpaRepository<AiMessage, Long> {

    List<AiMessage> findBySessionIdOrderBySequenceNumAsc(Long sessionId);

    /**
     * 查询指定用户最近的 N 条消息（跨所有聊天会话）。
     * 用于用户记忆画像更新时获取最近的对话轮次。
     */
    @Query(value = """
            SELECT m.* FROM ai_messages m
            INNER JOIN ai_sessions s ON m.session_id = s.id
            WHERE s.user_id = :userId
            ORDER BY s.updated_at DESC, m.sequence_num DESC
            LIMIT :limit
            """, nativeQuery = true)
    List<AiMessage> findRecentByUserId(@Param("userId") Long userId, @Param("limit") int limit);

    @Modifying
    @Query("""
            DELETE FROM AiMessage m
            WHERE m.sessionId IN (
                SELECT s.id FROM AiSession s WHERE s.userId = :userId
            )
            """)
    void deleteByUserId(@Param("userId") Long userId);
}
