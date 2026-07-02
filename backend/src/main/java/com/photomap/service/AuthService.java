package com.photomap.service;

import com.photomap.common.BusinessException;
import com.photomap.dto.LoginRequest;
import com.photomap.dto.LoginResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final PasswordEncoder passwordEncoder;
    private final SiteOwnerService siteOwnerService;
    private final JwtService jwtService;

    @Value("${admin.username:admin}")
    private String adminUsername;

    @Value("${admin.password-hash:}")
    private String adminPasswordHash;

    @Value("${jwt.expire-seconds:86400}")
    private Long jwtExpireSeconds;

    public LoginResponse login(LoginRequest request) {
        String expectedUsername = adminUsername == null ? "" : adminUsername.trim();

        if (!StringUtils.hasText(expectedUsername) || !StringUtils.hasText(adminPasswordHash)) {
            throw new BusinessException("管理员账号未配置");
        }

        boolean usernameMatches = expectedUsername.equals(request.getUsername().trim());
        boolean passwordMatches = false;
        try {
            passwordMatches = passwordEncoder.matches(request.getPassword(), adminPasswordHash);
        } catch (IllegalArgumentException ignored) {
            passwordMatches = false;
        }
        if (!usernameMatches || !passwordMatches) {
            throw new BusinessException(401, "用户名或密码错误");
        }

        Long ownerId = siteOwnerService.getOwnerId();
        String token = jwtService.createToken(ownerId, expectedUsername, jwtExpireSeconds);
        return new LoginResponse(token, jwtExpireSeconds);
    }
}
