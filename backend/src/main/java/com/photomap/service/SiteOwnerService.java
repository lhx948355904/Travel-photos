package com.photomap.service;

import com.photomap.common.BusinessException;
import com.photomap.entity.AppUser;
import com.photomap.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class SiteOwnerService {

    private static final String DISABLED_PASSWORD_HASH = "NO_LOGIN_DISABLED_SITE_OWNER";

    private final UserMapper userMapper;

    @Value("${site.owner-username:admin}")
    private String ownerUsername;

    private volatile Long cachedOwnerId;

    @Transactional
    public synchronized Long getOwnerId() {
        if (cachedOwnerId != null) {
            return cachedOwnerId;
        }

        String username = normalizeOwnerUsername();
        AppUser owner = userMapper.selectByUsername(username);
        if (owner != null) {
            cachedOwnerId = owner.getId();
            return cachedOwnerId;
        }

        AppUser newOwner = new AppUser();
        newOwner.setUsername(username);
        newOwner.setPasswordHash(DISABLED_PASSWORD_HASH);
        newOwner.setRole("ADMIN");
        userMapper.insert(newOwner);
        cachedOwnerId = newOwner.getId();
        return cachedOwnerId;
    }

    private String normalizeOwnerUsername() {
        String username = ownerUsername == null ? "" : ownerUsername.trim();
        if (!StringUtils.hasText(username)) {
            throw new BusinessException("Site owner username is required");
        }
        return username;
    }
}
