package com.diaryproject.backend.schedule.service;

import com.diaryproject.backend.schedule.dto.ScheduleDTO;
import com.diaryproject.backend.schedule.entity.Schedule;
import com.diaryproject.backend.schedule.repository.ScheduleRepository;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 日程服务，处理日程的创建、查询、更新、删除等业务
 */
@Service
public class ScheduleService {

    private final ScheduleRepository scheduleRepository;

    public ScheduleService(ScheduleRepository scheduleRepository) {
        this.scheduleRepository = scheduleRepository;
    }

    /** 创建新日程 */
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
        return mapToResponse(saved);
    }

    /** 查询指定日期的日程，按时间排序 */
    public List<ScheduleDTO.Response> getByDate(Long userId, LocalDate date) {
        return scheduleRepository.findByUserIdAndDateOrderByTimeAsc(userId, date)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /** 查询用户所有日程，按日期和时间倒序 */
    public List<ScheduleDTO.Response> getAll(Long userId) {
        return scheduleRepository.findByUserIdOrderByDateDescTimeDesc(userId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /** 更新日程，检查用户权限 */
    public ScheduleDTO.Response update(Long userId, Long id, ScheduleDTO.UpdateRequest request) {
        Schedule schedule = scheduleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Schedule not found"));

        if (!schedule.getUserId().equals(userId)) {
            throw new RuntimeException("Unauthorized");
        }

        schedule.setTitle(request.getTitle());
        schedule.setDescription(request.getDescription());
        schedule.setDate(request.getDate());
        schedule.setTime(request.getTime());
        schedule.setFeeling(request.getFeeling());

        Schedule updated = scheduleRepository.save(schedule);
        return mapToResponse(updated);
    }

    /** 删除日程，检查用户权限 */
    public void delete(Long userId, Long id) {
        Schedule schedule = scheduleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Schedule not found"));

        if (!schedule.getUserId().equals(userId)) {
            throw new RuntimeException("Unauthorized");
        }

        scheduleRepository.delete(schedule);
    }

    /** 查询指定日期范围内的日程，按日期和时间排序 */
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
