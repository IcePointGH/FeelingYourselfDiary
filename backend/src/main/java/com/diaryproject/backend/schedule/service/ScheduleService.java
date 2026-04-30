package com.diaryproject.backend.schedule.service;

import com.diaryproject.backend.common.cache.CacheKeys;
import com.diaryproject.backend.common.cache.CacheService;
import com.diaryproject.backend.common.exception.ResourceNotFoundException;
import com.diaryproject.backend.common.exception.UnauthorizedException;
import com.diaryproject.backend.diary.dto.DiaryDTO;
import com.diaryproject.backend.diary.service.DiaryService;
import com.diaryproject.backend.schedule.dto.ScheduleDTO;
import com.diaryproject.backend.schedule.entity.Schedule;
import com.diaryproject.backend.schedule.repository.ScheduleRepository;
import com.diaryproject.backend.settings.service.UserSettingsService;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * 日程服务，处理日程的创建、查询、更新、删除等业务
 */
@Service
public class ScheduleService {

    private static final Logger log = LoggerFactory.getLogger(ScheduleService.class);

    private final ScheduleRepository scheduleRepository;
    private final CacheService cacheService;
    private final DiaryService diaryService;
    private final UserSettingsService userSettingsService;

    public ScheduleService(ScheduleRepository scheduleRepository, CacheService cacheService,
                           DiaryService diaryService, UserSettingsService userSettingsService) {
        this.scheduleRepository = scheduleRepository;
        this.cacheService = cacheService;
        this.diaryService = diaryService;
        this.userSettingsService = userSettingsService;
    }

    /** 创建新日程 */
    @Transactional(rollbackFor = Exception.class)
    public ScheduleDTO.Response create(Long userId, ScheduleDTO.CreateRequest request) {
        Schedule schedule = Schedule.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .date(request.getDate())
                .time(request.getTime())
                .feeling(request.getFeeling())
                .userId(userId)
                .build();

        Schedule saved = scheduleRepository.save(schedule);
        log.info("用户 {} 创建日程，日期: {}", userId, request.getDate());
        autoArchiveToDiaryIfEnabled(userId, saved);
        cacheService.evictByPattern(CacheKeys.analysisPattern(userId));
        cacheService.evictByPattern(CacheKeys.schedulesPattern(userId));
        return mapToResponse(saved);
    }

    /** 查询指定日期的日程，按时间排序 */
    @Cacheable(value = "schedules", key = "'date:' + #userId + ':' + #date")
    @Transactional(readOnly = true)
    public List<ScheduleDTO.Response> getByDate(Long userId, LocalDate date) {
        return scheduleRepository.findByUserIdAndDateOrderByTimeAsc(userId, date)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /** 查询用户所有日程，分页返回，按日期和时间倒序 */
    @Transactional(readOnly = true)
    public Page<ScheduleDTO.Response> getAll(Long userId, Pageable pageable) {
        return scheduleRepository.findByUserId(userId, pageable)
                .map(this::mapToResponse);
    }

    /** 更新日程，检查用户权限 */
    @Transactional(rollbackFor = Exception.class)
    public ScheduleDTO.Response update(Long userId, Long id, ScheduleDTO.UpdateRequest request) {
        Schedule schedule = scheduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("日程", id));

        if (!schedule.getUserId().equals(userId)) {
            throw new UnauthorizedException("无权操作该日程");
        }

        schedule.setTitle(request.getTitle());
        schedule.setDescription(request.getDescription());
        schedule.setDate(request.getDate());
        schedule.setTime(request.getTime());
        schedule.setFeeling(request.getFeeling());

        Schedule updated = scheduleRepository.save(schedule);
        log.info("用户 {} 更新日程 id: {}", userId, id);
        autoArchiveToDiaryIfEnabled(userId, updated);
        cacheService.evictByPattern(CacheKeys.analysisPattern(userId));
        cacheService.evictByPattern(CacheKeys.schedulesPattern(userId));
        return mapToResponse(updated);
    }

    /** 删除日程，检查用户权限 */
    @Transactional(rollbackFor = Exception.class)
    public void delete(Long userId, Long id) {
        Schedule schedule = scheduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("日程", id));

        if (!schedule.getUserId().equals(userId)) {
            throw new UnauthorizedException("无权操作该日程");
        }

        scheduleRepository.delete(schedule);
        cacheService.evictByPattern(CacheKeys.analysisPattern(userId));
        cacheService.evictByPattern(CacheKeys.schedulesPattern(userId));
        log.warn("用户 {} 删除日程 id: {}", userId, id);
    }

    /** 查询指定日期范围内的日程，按日期和时间排序 */
    @Cacheable(value = "schedules", key = "'range:' + #userId + ':' + #start + ':' + #end")
    @Transactional(readOnly = true)
    public List<ScheduleDTO.Response> getByDateRange(Long userId, LocalDate start, LocalDate end) {
        return scheduleRepository.findByUserIdAndDateBetweenOrderByDateAscTimeAsc(userId, start, end)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<ScheduleDTO.Response> getWeekly(Long userId, LocalDate date) {
        LocalDate start = date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate end = date.with(TemporalAdjusters.nextOrSame(DayOfWeek.SUNDAY));
        return getByDateRange(userId, start, end);
    }

    /** 获取指定日期所在月的日程 */
    public List<ScheduleDTO.Response> getMonthly(Long userId, LocalDate date) {
        LocalDate start = date.withDayOfMonth(1);
        LocalDate end = date.with(TemporalAdjusters.lastDayOfMonth());
        return getByDateRange(userId, start, end);
    }

    /** 如果用户开启了"感受描述联动我的思考"且描述非空，则自动归档一份到日记 */
    private void autoArchiveToDiaryIfEnabled(Long userId, Schedule saved) {
        String desc = saved.getDescription();
        if (desc == null || desc.isBlank()) {
            return;
        }
        try {
            boolean enabled = userSettingsService.getSettings(userId).getAutoSaveThoughts();
            if (!enabled) {
                return;
            }
            DiaryDTO.CreateRequest req = new DiaryDTO.CreateRequest();
            req.setTitle(saved.getTitle());
            req.setContent(desc);
            req.setDate(saved.getDate());
            diaryService.create(userId, req);
            log.info("用户 {} 自动归档感受描述到我的思考，日程 id: {}", userId, saved.getId());
        } catch (Exception e) {
            log.warn("自动归档感受描述失败，不阻断日程保存: {}", e.getMessage());
        }
    }

    private ScheduleDTO.Response mapToResponse(Schedule schedule) {
        ScheduleDTO.Response response = new ScheduleDTO.Response();
        response.setId(schedule.getId());
        response.setTitle(schedule.getTitle());
        response.setDescription(schedule.getDescription());
        response.setDate(schedule.getDate());
        response.setTime(schedule.getTime());
        response.setFeeling(schedule.getFeeling());
        response.setCreatedAt(schedule.getCreatedAt().toString());
        response.setUpdatedAt(schedule.getUpdatedAt().toString());
        return response;
    }
}
