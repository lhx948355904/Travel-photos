package com.photomap.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.photomap.common.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class JwtService {

    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final Base64.Encoder BASE64_URL_ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder BASE64_URL_DECODER = Base64.getUrlDecoder();

    private final ObjectMapper objectMapper;

    @Value("${jwt.secret:}")
    private String jwtSecret;

    public String createToken(Long userId, String username, long expireSeconds) {
        validateSecret();

        long issuedAt = Instant.now().getEpochSecond();
        long expiresAt = issuedAt + expireSeconds;

        Map<String, Object> header = new LinkedHashMap<>();
        header.put("alg", "HS256");
        header.put("typ", "JWT");

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("sub", username);
        payload.put("uid", userId);
        payload.put("iat", issuedAt);
        payload.put("exp", expiresAt);

        String unsignedToken = encodeJson(header) + "." + encodeJson(payload);
        return unsignedToken + "." + sign(unsignedToken);
    }

    public JwtPrincipal parseToken(String token) {
        validateSecret();

        if (!StringUtils.hasText(token)) {
            throw new BusinessException(401, "未登录");
        }

        String[] parts = token.split("\\.");
        if (parts.length != 3) {
            throw new BusinessException(401, "登录状态无效");
        }

        String unsignedToken = parts[0] + "." + parts[1];
        String expectedSignature = sign(unsignedToken);
        if (!MessageDigest.isEqual(
                expectedSignature.getBytes(StandardCharsets.US_ASCII),
                parts[2].getBytes(StandardCharsets.US_ASCII))) {
            throw new BusinessException(401, "登录状态无效");
        }

        Map<String, Object> payload = decodePayload(parts[1]);
        Long expiresAt = toLong(payload.get("exp"));
        if (expiresAt == null) {
            throw new BusinessException(401, "登录状态无效");
        }
        if (expiresAt <= Instant.now().getEpochSecond()) {
            throw new BusinessException(401, "登录已过期");
        }

        String username = String.valueOf(payload.getOrDefault("sub", ""));
        Long userId = toLong(payload.get("uid"));
        if (!StringUtils.hasText(username) || userId == null) {
            throw new BusinessException(401, "登录状态无效");
        }

        return new JwtPrincipal(userId, username);
    }

    private String encodeJson(Map<String, Object> value) {
        try {
            return BASE64_URL_ENCODER.encodeToString(objectMapper.writeValueAsBytes(value));
        } catch (Exception e) {
            throw new BusinessException("生成登录凭证失败");
        }
    }

    private Map<String, Object> decodePayload(String encodedPayload) {
        try {
            byte[] bytes = BASE64_URL_DECODER.decode(encodedPayload);
            return objectMapper.readValue(bytes, new TypeReference<>() {
            });
        } catch (Exception e) {
            throw new BusinessException(401, "登录状态无效");
        }
    }

    private String sign(String value) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(jwtSecret.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM));
            return BASE64_URL_ENCODER.encodeToString(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new BusinessException("生成登录凭证失败");
        }
    }

    private Long toLong(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        if (value instanceof String text && StringUtils.hasText(text)) {
            try {
                return Long.parseLong(text);
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }

    private void validateSecret() {
        if (!StringUtils.hasText(jwtSecret)) {
            throw new BusinessException("JWT_SECRET 未配置");
        }
    }

    public record JwtPrincipal(Long userId, String username) {
    }
}
