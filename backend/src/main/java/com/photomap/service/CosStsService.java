package com.photomap.service;

import com.photomap.common.BusinessException;
import com.photomap.config.CosProperties;
import com.photomap.dto.CosCredentialResponse;
import com.photomap.dto.CosUploadResponse;
import com.qcloud.cos.COSClient;
import com.qcloud.cos.ClientConfig;
import com.qcloud.cos.auth.BasicCOSCredentials;
import com.qcloud.cos.auth.COSCredentials;
import com.qcloud.cos.exception.CosServiceException;
import com.qcloud.cos.model.CannedAccessControlList;
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
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.Iterator;
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
        String format = validateImage(file);

        String key = createObjectKey(userId, file.getOriginalFilename(), format);
        if (!hasCosConfig()) {
            return uploadLocalFile(file, key, "stored locally because COS config is incomplete");
        }

        COSClient cosClient = createClient();

        try {
            ObjectMetadata metadata = new ObjectMetadata();
            metadata.setContentLength(file.getSize());
            metadata.setContentType(resolveContentType(file.getContentType(), format));

            PutObjectRequest putObjectRequest = new PutObjectRequest(
                    cosProperties.getBucket(),
                    key,
                    file.getInputStream(),
                    metadata
            );
            if (cosProperties.isPublicReadAclEnabled()) {
                putObjectRequest.setCannedAcl(CannedAccessControlList.PublicRead);
            }
            cosClient.putObject(putObjectRequest);

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
            if (cosProperties.isLocalFallbackEnabled()) {
                return uploadLocalFile(file, key, "stored locally because COS upload failed");
            }
            throw new BusinessException("上传到 COS 失败");
        } finally {
            cosClient.shutdown();
        }
    }

    private CosUploadResponse uploadLocalFile(MultipartFile file, String key, String reason) {
        Path target = resolveLocalPath(key);

        try {
            Files.createDirectories(target.getParent());
            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, target, StandardCopyOption.REPLACE_EXISTING);
            }

            CosUploadResponse response = new CosUploadResponse();
            response.setCosKey(key);
            response.setUrl(buildLocalPublicUrl(key));
            response.setStatus("approved");
            response.setReviewReason(reason);
            log.info("Saved upload locally, key={}, path={}", key, target);
            return response;
        } catch (IOException e) {
            log.error("Failed to save upload locally", e);
            throw new BusinessException("保存本地上传文件失败");
        }
    }

    public boolean objectExists(String key) {
        if (!StringUtils.hasText(key)) {
            return false;
        }
        if (localObjectExists(key)) {
            return true;
        }
        if (!hasCosConfig()) {
            log.warn("Skip COS object check because COS config is incomplete");
            return false;
        }

        COSClient cosClient = createClient();
        try {
            return cosClient.doesObjectExist(cosProperties.getBucket(), key);
        } catch (CosServiceException e) {
            if (isObjectMissing(e)) {
                log.info("COS object does not exist, key={}, status={}, code={}",
                        key,
                        e.getStatusCode(),
                        e.getErrorCode());
                return false;
            }
            log.warn("Failed to check COS object existence, key={}, status={}, code={}, message={}",
                    key,
                    e.getStatusCode(),
                    e.getErrorCode(),
                    e.getErrorMessage());
            return true;
        } catch (Exception e) {
            log.warn("Failed to check COS object existence, key={}, message={}", key, e.getMessage());
            return true;
        } finally {
            cosClient.shutdown();
        }
    }

    public String resolvePublicUrl(String key, String fallbackUrl) {
        if (!StringUtils.hasText(key)) {
            return fallbackUrl;
        }
        if (localObjectExists(key)) {
            return buildLocalPublicUrl(key);
        }
        if (!hasCosConfig()) {
            return fallbackUrl;
        }
        return buildPublicUrl(key);
    }

    private void validateCosConfig() {
        if (!hasCosConfig()) {
            throw new BusinessException("COS 配置不完整，请检查 .env 或环境变量");
        }
    }

    private boolean hasCosConfig() {
        return StringUtils.hasText(cosProperties.getSecretId())
                && StringUtils.hasText(cosProperties.getSecretKey())
                && StringUtils.hasText(cosProperties.getBucket())
                && StringUtils.hasText(cosProperties.getRegion());
    }

    private boolean isObjectMissing(CosServiceException e) {
        return e.getStatusCode() == 404
                || "NoSuchKey".equalsIgnoreCase(e.getErrorCode())
                || "404 Not Found".equalsIgnoreCase(e.getErrorCode());
    }

    private COSClient createClient() {
        COSCredentials credentials = new BasicCOSCredentials(cosProperties.getSecretId(), cosProperties.getSecretKey());
        ClientConfig clientConfig = new ClientConfig(new Region(cosProperties.getRegion()));
        applyPositiveTimeout(cosProperties.getConnectTimeoutMillis(), clientConfig::setConnectionTimeout);
        applyPositiveTimeout(cosProperties.getConnectTimeoutMillis(), clientConfig::setConnectionRequestTimeout);
        applyPositiveTimeout(cosProperties.getSocketTimeoutMillis(), clientConfig::setSocketTimeout);
        applyPositiveTimeout(cosProperties.getRequestTimeoutMillis(), clientConfig::setRequestTimeout);
        clientConfig.setRequestTimeOutEnable(cosProperties.getRequestTimeoutMillis() > 0);
        return new COSClient(credentials, clientConfig);
    }

    private void applyPositiveTimeout(int timeoutMillis, java.util.function.IntConsumer setter) {
        if (timeoutMillis > 0) {
            setter.accept(timeoutMillis);
        }
    }

    private String resolveContentType(String browserContentType, String detectedFormat) {
        if (StringUtils.hasText(browserContentType) && !"application/octet-stream".equals(browserContentType)) {
            return browserContentType;
        }
        return switch (detectedFormat) {
            case "jpg", "jpeg" -> "image/jpeg";
            case "png" -> "image/png";
            case "gif" -> "image/gif";
            case "bmp" -> "image/bmp";
            case "webp" -> "image/webp";
            case "heic" -> "image/heic";
            default -> "application/octet-stream";
        };
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
                validateImageDimensions(bytes, format);
            }

            return format;
        } catch (BusinessException e) {
            throw e;
        } catch (IOException e) {
            throw new BusinessException("读取上传图片失败");
        } catch (RuntimeException e) {
            log.warn("Failed to parse upload image metadata, filename={}", file.getOriginalFilename(), e);
            throw new BusinessException("图片无法解析，请换一张 JPG/PNG 照片");
        }
    }

    private void validateImageDimensions(byte[] bytes, String format) throws IOException {
        String readerFormat = "jpg".equals(format) ? "jpeg" : format;
        Iterator<ImageReader> readers = ImageIO.getImageReadersByFormatName(readerFormat);
        if (!readers.hasNext()) {
            throw new BusinessException("图片格式暂不支持");
        }

        ImageReader reader = readers.next();
        try (ImageInputStream imageInputStream = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
            if (imageInputStream == null) {
                throw new BusinessException("图片无法解析");
            }
            reader.setInput(imageInputStream, true, true);
            int width = reader.getWidth(0);
            int height = reader.getHeight(0);
            if (width <= 0 || height <= 0) {
                throw new BusinessException("图片无法解析");
            }
            if ((long) width * height > MAX_PIXELS) {
                throw new BusinessException("图片像素过大");
            }
        } finally {
            reader.dispose();
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

    private String buildLocalPublicUrl(String key) {
        String publicPath = cosProperties.getLocalPublicPath();
        if (!StringUtils.hasText(publicPath)) {
            publicPath = "/uploads";
        }
        String normalized = publicPath.trim();
        if (!normalized.startsWith("/")) {
            normalized = "/" + normalized;
        }
        normalized = normalized.replaceAll("/+$", "");
        return normalized + "/" + key;
    }

    private boolean localObjectExists(String key) {
        try {
            return Files.isRegularFile(resolveLocalPath(key));
        } catch (BusinessException e) {
            return false;
        }
    }

    private Path resolveLocalPath(String key) {
        Path uploadRoot = Paths.get(cosProperties.getLocalUploadDir()).toAbsolutePath().normalize();
        Path target = uploadRoot.resolve(key).normalize();
        if (!target.startsWith(uploadRoot)) {
            throw new BusinessException("上传路径不合法");
        }
        return target;
    }
}
