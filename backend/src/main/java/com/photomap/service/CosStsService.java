package com.photomap.service;

import com.photomap.common.BusinessException;
import com.photomap.config.CosProperties;
import com.photomap.dto.CosCredentialResponse;
import com.tencent.cloud.CosStsClient;
import com.tencent.cloud.Response;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.TreeMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class CosStsService {

    private final CosProperties cosProperties;

    public CosCredentialResponse getCredential() {
        if (!StringUtils.hasText(cosProperties.getSecretId())
                || !StringUtils.hasText(cosProperties.getSecretKey())
                || !StringUtils.hasText(cosProperties.getBucket())
                || !StringUtils.hasText(cosProperties.getRegion())) {
            throw new BusinessException("COS 配置不完整，请检查 .env 或环境变量");
        }

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
}
