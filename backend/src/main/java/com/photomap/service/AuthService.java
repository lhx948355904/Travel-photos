package com.photomap.service;

import com.photomap.common.BusinessException;
import com.photomap.config.AdminProperties;
import com.photomap.dto.LoginRequest;
import com.photomap.dto.LoginResponse;
import com.photomap.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final JwtUtil jwtUtil;
    private final AdminProperties adminProperties;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public LoginResponse login(LoginRequest request) {
        if (!adminProperties.getUsername().equals(request.getUsername())) {
            throw new BusinessException(401, "用户名或密码错误");
        }

        boolean matches = passwordEncoder.matches(request.getPassword(), adminProperties.getPasswordHash());
        if (!matches) {
            throw new BusinessException(401, "用户名或密码错误");
        }

        String token = jwtUtil.generateToken(request.getUsername());
        return new LoginResponse(token, 86400L);
    }
}
