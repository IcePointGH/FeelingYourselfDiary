package com.diaryproject.backend.diary.service;

import com.diaryproject.backend.diary.dto.DiaryDTO;
import com.diaryproject.backend.diary.entity.Diary;
import com.diaryproject.backend.diary.repository.DiaryRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 日记服务，处理日记的创建、查询、更新、删除等业务
 */
@Service
public class DiaryService {

    private final DiaryRepository diaryRepository;

    public DiaryService(DiaryRepository diaryRepository) {
        this.diaryRepository = diaryRepository;
    }

    /**
     * 创建新日记
     * @param userId 用户 ID
     * @param request 日记创建请求（标题、内容、日期）
     * @return 创建的日记响应
     */
    public DiaryDTO.Response create(Long userId, DiaryDTO.CreateRequest request) {
        Diary diary = Diary.builder()
                .title(request.getTitle())
                .content(request.getContent())
                .date(request.getDate())
                .userId(userId)
                .build();

        Diary saved = diaryRepository.save(diary);
        return mapToResponse(saved);
    }

    /**
     * 查询指定日期的日记列表，按创建时间倒序
     */
    public List<DiaryDTO.Response> getByDate(Long userId, LocalDate date) {
        return diaryRepository.findByUserIdAndDateOrderByCreatedAtDesc(userId, date)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /** 查询用户所有日记，按日期倒序 */
    public List<DiaryDTO.Response> getAll(Long userId) {
        return diaryRepository.findByUserIdOrderByDateDesc(userId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * 更新日记，仅允许日记所有者操作
     * @throws RuntimeException 如果日记不存在或无权操作
     */
    public DiaryDTO.Response update(Long userId, Long id, DiaryDTO.UpdateRequest request) {
        Diary diary = diaryRepository.findByUserIdAndId(userId, id)
                .orElseThrow(() -> new RuntimeException("Diary not found"));

        diary.setTitle(request.getTitle());
        diary.setContent(request.getContent());
        diary.setDate(request.getDate());

        Diary updated = diaryRepository.save(diary);
        return mapToResponse(updated);
    }

    /** 删除日记，仅允许日记所有者操作 */
    public void delete(Long userId, Long id) {
        Diary diary = diaryRepository.findByUserIdAndId(userId, id)
                .orElseThrow(() -> new RuntimeException("Diary not found"));
        diaryRepository.delete(diary);
    }

    private DiaryDTO.Response mapToResponse(Diary diary) {
        DiaryDTO.Response response = new DiaryDTO.Response();
        response.setId(diary.getId());
        response.setTitle(diary.getTitle());
        response.setContent(diary.getContent());
        response.setDate(diary.getDate());
        response.setCreatedAt(diary.getCreatedAt().toString());
        response.setUpdatedAt(diary.getUpdatedAt().toString());
        return response;
    }
}
