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

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.TreeMap;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class CosStsService {

    private static final long MAX_FILE_SIZE = 20L * 1024L * 1024L;
    private static final long MAX_PIXELS = 40_000_000L;
    private static final Set<String> DECODE_REQUIRED_FORMATS = Set.of("jpg", "jpeg", "png", "gif", "bmp");

    private final CosProperties cosProperties;

    public CosCredentialResponse getCredential(Long userId) {
        validateCosConfig();

        try {
            String prefix = createUserPrefix(userId) + "/*";

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

    public CosUploadResponse uploadFile(Long userId, MultipartFile file) {
        validateCosConfig();
        String format = validateImage(file);

        String key = createObjectKey(userId, file.getOriginalFilename(), format);
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
            response.setStatus("approved");
            response.setReviewReason("basic image validation passed");
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

    private String validateImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("请选择要上传的图片");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new BusinessException("图片大小不能超过 20MB");
        }

        try {
            byte[] bytes = file.getBytes();
            String format = detectImageFormat(bytes);
            if (!StringUtils.hasText(format)) {
                throw new BusinessException("文件不是合法图片");
            }

            if (DECODE_REQUIRED_FORMATS.contains(format)) {
                BufferedImage image = ImageIO.read(new ByteArrayInputStream(bytes));
                if (image == null || image.getWidth() <= 0 || image.getHeight() <= 0) {
                    throw new BusinessException("图片无法解析");
                }
                if ((long) image.getWidth() * image.getHeight() > MAX_PIXELS) {
                    throw new BusinessException("图片像素过大");
                }
            }

            return format;
        } catch (BusinessException e) {
            throw e;
        } catch (IOException e) {
            throw new BusinessException("读取上传图片失败");
        }
    }

    private String detectImageFormat(byte[] bytes) {
        if (bytes.length >= 3
                && (bytes[0] & 0xFF) == 0xFF
                && (bytes[1] & 0xFF) == 0xD8
                && (bytes[2] & 0xFF) == 0xFF) {
            return "jpg";
        }
        if (bytes.length >= 8
                && (bytes[0] & 0xFF) == 0x89
                && bytes[1] == 0x50
                && bytes[2] == 0x4E
                && bytes[3] == 0x47
                && bytes[4] == 0x0D
                && bytes[5] == 0x0A
                && bytes[6] == 0x1A
                && bytes[7] == 0x0A) {
            return "png";
        }
        if (bytes.length >= 6
                && (startsWith(bytes, "GIF87a") || startsWith(bytes, "GIF89a"))) {
            return "gif";
        }
        if (bytes.length >= 2 && bytes[0] == 0x42 && bytes[1] == 0x4D) {
            return "bmp";
        }
        if (bytes.length >= 12
                && startsWith(bytes, "RIFF")
                && bytes[8] == 0x57
                && bytes[9] == 0x45
                && bytes[10] == 0x42
                && bytes[11] == 0x50) {
            return "webp";
        }
        if (bytes.length >= 12
                && bytes[4] == 0x66
                && bytes[5] == 0x74
                && bytes[6] == 0x79
                && bytes[7] == 0x70
                && isHeicBrand(Arrays.copyOfRange(bytes, 8, 12))) {
            return "heic";
        }
        return null;
    }

    private boolean startsWith(byte[] bytes, String text) {
        byte[] expected = text.getBytes();
        if (bytes.length < expected.length) {
            return false;
        }
        for (int i = 0; i < expected.length; i++) {
            if (bytes[i] != expected[i]) {
                return false;
            }
        }
        return true;
    }

    private boolean isHeicBrand(byte[] brand) {
        String value = new String(brand).toLowerCase(Locale.ROOT);
        return value.equals("heic") || value.equals("heix") || value.equals("hevc")
                || value.equals("hevx") || value.equals("mif1") || value.equals("msf1");
    }

    private String createObjectKey(Long userId, String originalFilename, String detectedFormat) {
        String prefix = createUserPrefix(userId);
        String ext = StringUtils.hasText(detectedFormat) ? detectedFormat : "jpg";
        if ("jpg".equals(ext) && StringUtils.hasText(originalFilename)
                && originalFilename.toLowerCase(Locale.ROOT).endsWith(".jpeg")) {
            ext = "jpeg";
        }
        return prefix + "/" + System.currentTimeMillis() + "_" + UUID.randomUUID() + "." + ext;
    }

    private String createUserPrefix(Long userId) {
        return "users/" + userId + "/photos/" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy/MM"));
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
