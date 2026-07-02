package com.photomap.service;

import com.photomap.common.BusinessException;
import com.photomap.config.AdminProperties;
import com.photomap.config.JwtProperties;
import com.photomap.dto.LoginRequest;
import com.photomap.dto.LoginResponse;
import com.photomap.dto.RegisterRequest;
import com.photomap.dto.UserVO;
import com.photomap.entity.AppUser;
import com.photomap.mapper.UserMapper;
import com.photomap.util.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final JwtUtil jwtUtil;
    private final AdminProperties adminProperties;
    private final JwtProperties jwtProperties;
    private final UserMapper userMapper;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Transactional
    public UserVO register(RegisterRequest request) {
        String username = normalizeUsername(request.getUsername());
        if (!StringUtils.hasText(username)) {
            throw new BusinessException("Username is required");
        }
        if (request.getPassword() == null || request.getPassword().length() < 6) {
            throw new BusinessException("Password must be at least 6 characters");
        }
        if (adminProperties.getUsername().equals(username)) {
            throw new BusinessException(409, "Username is reserved");
        }
        if (userMapper.selectByUsername(username) != null) {
            throw new BusinessException(409, "Username already exists");
        }

        AppUser user = new AppUser();
        user.setUsername(username);
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setRole("USER");
        userMapper.insert(user);

        return toUserVO(user);
    }

    @Transactional
    public LoginResponse login(LoginRequest request) {
        String username = normalizeUsername(request.getUsername());
        AppUser user = userMapper.selectByUsername(username);
        boolean createdFromAdminConfig = false;

        if (user == null && adminProperties.getUsername().equals(username)) {
            boolean adminMatches = passwordEncoder.matches(request.getPassword(), adminProperties.getPasswordHash());
            if (adminMatches) {
                user = ensureAdminUser(username);
                createdFromAdminConfig = true;
            }
        }

        if (user == null) {
            throw new BusinessException(401, "Invalid username or password");
        }

        if (!createdFromAdminConfig && !passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new BusinessException(401, "Invalid username or password");
        }

        String token = jwtUtil.generateToken(user.getId(), user.getUsername(), user.getRole());
        return new LoginResponse(token, jwtProperties.getExpireSeconds(), toUserVO(user));
    }

    private AppUser ensureAdminUser(String username) {
        AppUser existing = userMapper.selectByUsername(username);
        if (existing != null) {
            return existing;
        }

        AppUser admin = new AppUser();
        admin.setUsername(username);
        admin.setPasswordHash(adminProperties.getPasswordHash());
        admin.setRole("ADMIN");
        userMapper.insert(admin);
        return admin;
    }

    private String normalizeUsername(String username) {
        return username == null ? "" : username.trim();
    }

    private UserVO toUserVO(AppUser user) {
        return new UserVO(user.getId(), user.getUsername(), user.getRole());
    }
}
