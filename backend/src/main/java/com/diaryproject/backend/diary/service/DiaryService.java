package com.diaryproject.backend.diary.service;

import com.diaryproject.backend.common.cache.CacheKeys;
import com.diaryproject.backend.common.cache.CacheService;
import com.diaryproject.backend.common.exception.ResourceNotFoundException;
import org.springframework.cache.annotation.Cacheable;
import com.diaryproject.backend.diary.dto.DiaryDTO;
import com.diaryproject.backend.diary.entity.Diary;
import com.diaryproject.backend.diary.repository.DiaryRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * 日记服务，处理日记的创建、查询、更新、删除等业务
 */
@Service
public class DiaryService {

    private static final Logger log = LoggerFactory.getLogger(DiaryService.class);

    private final DiaryRepository diaryRepository;
    private final CacheService cacheService;

    public DiaryService(DiaryRepository diaryRepository, CacheService cacheService) {
        this.diaryRepository = diaryRepository;
        this.cacheService = cacheService;
    }

    /**
     * 创建新日记
     * @param userId 用户 ID
     * @param request 日记创建请求（标题、内容、日期）
     * @return 创建的日记响应
     */
    @Transactional(rollbackFor = Exception.class)
    public DiaryDTO.Response create(Long userId, DiaryDTO.CreateRequest request) {
        Diary diary = Diary.builder()
                .title(request.getTitle())
                .content(request.getContent())
                .date(request.getDate())
                .userId(userId)
                .build();

        Diary saved = diaryRepository.save(diary);
        log.info("用户 {} 创建日记，日期: {}", userId, request.getDate());
        cacheService.evictByPattern(CacheKeys.diaryPattern(userId));
        return mapToResponse(saved);
    }

    /**
     * 查询指定日期的日记列表，按创建时间倒序
     */
    @Cacheable(value = "diaries", key = "'date:' + #userId + ':' + #date")
    @Transactional(readOnly = true)
    public List<DiaryDTO.Response> getByDate(Long userId, LocalDate date) {
        return diaryRepository.findByUserIdAndDateOrderByCreatedAtDesc(userId, date)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /** 查询用户所有日记，分页返回，按日期倒序 */
    @Transactional(readOnly = true)
    public Page<DiaryDTO.Response> getAll(Long userId, Pageable pageable) {
        return diaryRepository.findByUserId(userId, pageable)
                .map(this::mapToResponse);
    }

    /**
     * 更新日记，仅允许日记所有者操作
     * @throws RuntimeException 如果日记不存在或无权操作
     */
    @Transactional(rollbackFor = Exception.class)
    public DiaryDTO.Response update(Long userId, Long id, DiaryDTO.UpdateRequest request) {
        Diary diary = diaryRepository.findByUserIdAndId(userId, id)
                .orElseThrow(() -> new ResourceNotFoundException("日记", id));

        diary.setTitle(request.getTitle());
        diary.setContent(request.getContent());
        diary.setDate(request.getDate());

        Diary updated = diaryRepository.save(diary);
        log.info("用户 {} 更新日记 id: {}", userId, id);
        cacheService.evictByPattern(CacheKeys.diaryPattern(userId));
        return mapToResponse(updated);
    }

    /** 删除日记，仅允许日记所有者操作 */
    @Transactional(rollbackFor = Exception.class)
    public void delete(Long userId, Long id) {
        Diary diary = diaryRepository.findByUserIdAndId(userId, id)
                .orElseThrow(() -> new ResourceNotFoundException("日记", id));
        diaryRepository.delete(diary);
        cacheService.evictByPattern(CacheKeys.diaryPattern(userId));
        log.warn("用户 {} 删除日记 id: {}", userId, id);
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
