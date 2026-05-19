package com.diaryproject.backend.auth.controller;

import com.diaryproject.backend.auth.service.AuthService;
import com.diaryproject.backend.common.dto.ApiResponse;
import com.diaryproject.backend.common.service.MinioService;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/auth")
public class AvatarController {

    private static final Logger log = LoggerFactory.getLogger(AvatarController.class);

    private final MinioService minioService;
    private final AuthService authService;

    public AvatarController(MinioService minioService, AuthService authService) {
        this.minioService = minioService;
        this.authService = authService;
    }

    @PostMapping("/avatar")
    public ApiResponse<String> uploadAvatar(@RequestParam("file") MultipartFile file,
                                            HttpServletRequest request) {
        Long userId = (Long) request.getAttribute("userId");
        log.info("收到头像上传请求，userId: {}, fileName: {}, size: {} bytes",
                userId, file.getOriginalFilename(), file.getSize());

        String originalFilename = file.getOriginalFilename();
        String ext = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            ext = originalFilename.substring(originalFilename.lastIndexOf(".") + 1);
        }
        String objectName = "avatar-" + userId + "-" + System.currentTimeMillis() + "." + ext;

        String avatarUrl = minioService.uploadAvatar(file, objectName);
        authService.updateAvatar(userId, avatarUrl);

        log.info("头像上传处理完成，userId: {}, avatarUrl: {}", userId, avatarUrl);
        return ApiResponse.success(avatarUrl);
    }
}
