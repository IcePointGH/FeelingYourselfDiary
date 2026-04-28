package com.diaryproject.backend.common.service;

import com.diaryproject.backend.common.config.MinioConfig;
import com.diaryproject.backend.common.exception.BadRequestException;
import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.SetBucketPolicyArgs;
import io.minio.errors.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;

@Service
public class MinioService {

    private static final Logger log = LoggerFactory.getLogger(MinioService.class);

    private final MinioClient minioClient;
    private final MinioConfig minioConfig;

    public MinioService(MinioClient minioClient, MinioConfig minioConfig) {
        this.minioClient = minioClient;
        this.minioConfig = minioConfig;
    }

    public String uploadAvatar(MultipartFile file, String objectName) {
        String bucketName = minioConfig.getBucketName();
        log.info("正在上传头像到 MinIO，bucket: {}, objectName: {}, size: {} bytes", bucketName, objectName, file.getSize());
        try {
            boolean found = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build());
            if (!found) {
                log.info("MinIO bucket '{}' 不存在，正在创建...", bucketName);
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());
                log.info("MinIO bucket '{}' 创建成功", bucketName);

                String policy = "{" +
                        "\"Version\":\"2012-10-17\"," +
                        "\"Statement\":[{\"Effect\":\"Allow\"," +
                        "\"Principal\":\"*\"," +
                        "\"Action\":\"s3:GetObject\"," +
                        "\"Resource\":\"arn:aws:s3:::" + bucketName + "/*\"}]" +
                        "}";
                minioClient.setBucketPolicy(SetBucketPolicyArgs.builder().bucket(bucketName).config(policy).build());
                log.info("MinIO bucket '{}' 已设置为 public-read", bucketName);
            }

            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucketName)
                            .object(objectName)
                            .stream(file.getInputStream(), file.getSize(), -1)
                            .contentType(file.getContentType())
                            .build()
            );

            String url = minioConfig.getEndpoint() + "/" + bucketName + "/" + objectName;
            log.info("头像上传成功，访问 URL: {}", url);
            return url;
        } catch (ErrorResponseException | InsufficientDataException | InternalException | InvalidKeyException |
                 InvalidResponseException | IOException | NoSuchAlgorithmException | ServerException |
                 XmlParserException e) {
            log.error("头像上传到 MinIO 失败，bucket: {}, objectName: {}", bucketName, objectName, e);
            throw new BadRequestException("头像上传失败: " + e.getMessage());
        }
    }
}
