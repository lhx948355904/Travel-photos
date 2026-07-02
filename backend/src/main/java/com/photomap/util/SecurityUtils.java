package com.photomap.util;

import com.photomap.common.BusinessException;
import com.photomap.common.CurrentUser;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class SecurityUtils {

    private SecurityUtils() {
    }

    public static CurrentUser currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof CurrentUser user)) {
            throw new BusinessException(401, "请先登录");
        }
        return user;
    }

    public static Long currentUserId() {
        return currentUser().getId();
    }
}
