package com.photomap.service;

import com.photomap.common.BusinessException;
import com.photomap.config.CosProperties;
import com.photomap.dto.CosCredentialResponse;
import com.photomap.dto.CosUploadResponse;
import com.qcloud.cos.COSClient;
import com.qcloud.cos.ClientConfig;
import com.qcloud.cos.auth.BasicCOSCredentials;
import com.qcloud.cos.auth.COSCredentials;
import com.qcloud.cos.model.ObjectMetadata;
import com.qcloud.cos.model.PutObjectRequest;
import com.qcloud.cos.region.Region;
import com.tencent.cloud.CosStsClient;
import com.tencent.cloud.Response;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.TreeMap;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class CosStsService {

    private static final long MAX_FILE_SIZE = 20L * 1024L * 1024L;

    private final CosProperties cosProperties;

    public CosCredentialResponse getCredential() {
        validateCosConfig();

        try {
            String prefix = "photos/" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy/MM")) + "/*";

            TreeMap<String, Object> config = new TreeMap<>();
            config.put("secretId", cosProperties.getSecretId());
            config.put("secretKey", cosProperties.getSecretKey());
            config.put("durationSeconds", 1800);
            config.put("bucket", cosProperties.getBucket());
            config.put("region", cosProperties.getRegion());
            config.put("allowPrefixes", new String[]{ prefix });
            config.put("allowActions", new String[]{
                    "name/cos:PutObject",
                    "name/cos:PostObject",
                    "name/cos:InitiateMultipartUpload",
                    "name/cos:ListMultipartUploads",
                    "name/cos:ListParts",
                    "name/cos:UploadPart",
                    "name/cos:CompleteMultipartUpload"
            });

            Response resp = CosStsClient.getCredential(config);

            CosCredentialResponse dto = new CosCredentialResponse();
            dto.setTmpSecretId(resp.credentials.tmpSecretId);
            dto.setTmpSecretKey(resp.credentials.tmpSecretKey);
            dto.setSessionToken(resp.credentials.sessionToken);
            dto.setBucket(cosProperties.getBucket());
            dto.setRegion(cosProperties.getRegion());
            dto.setStartTime(resp.startTime);
            dto.setExpiredTime(resp.expiredTime);
            dto.setAllowPrefix(prefix);

            return dto;
        } catch (Exception e) {
            log.error("Failed to get COS credential", e);
            throw new BusinessException("获取上传凭证失败");
        }
    }

    public CosUploadResponse uploadFile(MultipartFile file) {
        validateCosConfig();
        validateImage(file);

        String key = createObjectKey(file.getOriginalFilename());
        COSCredentials credentials = new BasicCOSCredentials(cosProperties.getSecretId(), cosProperties.getSecretKey());
        ClientConfig clientConfig = new ClientConfig(new Region(cosProperties.getRegion()));
        COSClient cosClient = new COSClient(credentials, clientConfig);

        try {
            ObjectMetadata metadata = new ObjectMetadata();
            metadata.setContentLength(file.getSize());
            if (StringUtils.hasText(file.getContentType())) {
                metadata.setContentType(file.getContentType());
            }

            cosClient.putObject(new PutObjectRequest(
                    cosProperties.getBucket(),
                    key,
                    file.getInputStream(),
                    metadata
            ));

            CosUploadResponse response = new CosUploadResponse();
            response.setCosKey(key);
            response.setUrl(buildPublicUrl(key));
            return response;
        } catch (IOException e) {
            log.error("Failed to read upload file", e);
            throw new BusinessException("读取上传文件失败");
        } catch (Exception e) {
            log.error("Failed to upload file to COS", e);
            throw new BusinessException("上传到 COS 失败");
        } finally {
            cosClient.shutdown();
        }
    }

    private void validateCosConfig() {
        if (!StringUtils.hasText(cosProperties.getSecretId())
                || !StringUtils.hasText(cosProperties.getSecretKey())
                || !StringUtils.hasText(cosProperties.getBucket())
                || !StringUtils.hasText(cosProperties.getRegion())) {
            throw new BusinessException("COS 配置不完整，请检查 .env 或环境变量");
        }
    }

    private void validateImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("请选择要上传的图片");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new BusinessException("图片大小不能超过 20MB");
        }

        String filename = file.getOriginalFilename();
        String contentType = file.getContentType();
        boolean isImageType = StringUtils.hasText(contentType)
                && contentType.toLowerCase(Locale.ROOT).startsWith("image/");
        boolean isHeic = StringUtils.hasText(filename)
                && filename.toLowerCase(Locale.ROOT).endsWith(".heic");

        if (!isImageType && !isHeic) {
            throw new BusinessException("只能上传图片文件");
        }
    }

    private String createObjectKey(String originalFilename) {
        String prefix = "photos/" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy/MM"));
        String ext = "jpg";
        if (StringUtils.hasText(originalFilename) && originalFilename.contains(".")) {
            ext = originalFilename.substring(originalFilename.lastIndexOf('.') + 1)
                    .toLowerCase(Locale.ROOT)
                    .replaceAll("[^a-z0-9]", "");
            if (!StringUtils.hasText(ext)) {
                ext = "jpg";
            }
        }
        return prefix + "/" + System.currentTimeMillis() + "_" + UUID.randomUUID() + "." + ext;
    }

    private String buildPublicUrl(String key) {
        String cdnDomain = cosProperties.getCdnDomain();
        if (StringUtils.hasText(cdnDomain)) {
            return cdnDomain.replaceAll("/+$", "") + "/" + key;
        }
        return "https://" + cosProperties.getBucket() + ".cos."
                + cosProperties.getRegion() + ".myqcloud.com/" + key;
    }
}
