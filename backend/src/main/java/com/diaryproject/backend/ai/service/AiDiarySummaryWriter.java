package com.diaryproject.backend.ai.service;

import com.diaryproject.backend.ai.entity.AiSession;
import com.diaryproject.backend.ai.repository.AiSessionRepository;
import com.diaryproject.backend.diary.dto.DiaryDTO;
import com.diaryproject.backend.diary.entity.Diary;
import com.diaryproject.backend.diary.repository.DiaryRepository;
import com.diaryproject.backend.diary.service.DiaryService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

@Service
public class AiDiarySummaryWriter {

    private static final Logger log = LoggerFactory.getLogger(AiDiarySummaryWriter.class);

    private final DiaryRepository diaryRepository;
    private final DiaryService diaryService;
    private final AiSessionRepository aiSessionRepository;

    public AiDiarySummaryWriter(DiaryRepository diaryRepository,
                                DiaryService diaryService,
                                AiSessionRepository aiSessionRepository) {
        this.diaryRepository = diaryRepository;
        this.diaryService = diaryService;
        this.aiSessionRepository = aiSessionRepository;
    }

    public Result write(Long userId, AiSession session, String title, String content, LocalDate date) {
        if (session.getDiaryId() == null) {
            return createAndLinkDiary(userId, session, title, content, date);
        }

        Diary diary = diaryRepository.findByUserIdAndId(userId, session.getDiaryId()).orElse(null);
        if (diary == null) {
            log.warn("AI summary linked diary is missing, creating replacement - sessionId: {}, oldDiaryId: {}",
                    session.getId(), session.getDiaryId());
            return createAndLinkDiary(userId, session, title, content, date);
        }

        diary.setTitle(title);
        diary.setContent(content);
        diaryRepository.save(diary);
        log.info("Updated diary from AI summary - diaryId: {}, sessionId: {}", diary.getId(), session.getId());
        return new Result(diary.getId(), date, true);
    }

    private Result createAndLinkDiary(Long userId, AiSession session, String title, String content, LocalDate date) {
        DiaryDTO.CreateRequest createReq = new DiaryDTO.CreateRequest();
        createReq.setTitle(title);
        createReq.setContent(content);
        createReq.setDate(date);

        DiaryDTO.Response created = diaryService.create(userId, createReq);
        session.setDiaryId(created.getId());
        aiSessionRepository.save(session);
        log.info("Created diary from AI summary - diaryId: {}, sessionId: {}", created.getId(), session.getId());
        return new Result(created.getId(), date, false);
    }

    public record Result(Long diaryId, LocalDate diaryDate, boolean updated) {
    }
}
