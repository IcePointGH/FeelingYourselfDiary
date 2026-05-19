package com.diaryproject.backend.common.service;

import com.diaryproject.backend.common.config.MinioConfig;
import io.minio.BucketExistsArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class MinioServiceTest {

    @Test
    void uploadAvatar_returnsSameOriginApiUrl_notInternalMinioEndpoint() throws Exception {
        MinioClient minioClient = mock(MinioClient.class);
        MinioConfig minioConfig = new MinioConfig();
        minioConfig.setEndpoint("http://minio:9000");
        minioConfig.setBucketName("avatars");
        when(minioClient.bucketExists(any(BucketExistsArgs.class))).thenReturn(true);

        MinioService service = new MinioService(minioClient, minioConfig);
        MockMultipartFile file = new MockMultipartFile("file", "avatar.png", "image/png", new byte[] {1, 2, 3});

        String url = service.uploadAvatar(file, "avatar-1.png");

        assertEquals("/api/auth/avatar/avatar-1.png", url);
        assertFalse(url.contains("minio:9000"));
        verify(minioClient).putObject(any(PutObjectArgs.class));
    }

    @Test
    void toPublicAvatarUrl_rewritesLegacyInternalMinioUrl() {
        String url = MinioService.toPublicAvatarUrl("http://minio:9000/avatars/avatar-1.png");

        assertEquals("/api/auth/avatar/avatar-1.png", url);
    }
}
