package com.photomap.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
@RequiredArgsConstructor
public class LocalUploadConfig implements WebMvcConfigurer {

    private final CosProperties cosProperties;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String publicPath = normalizePublicPath(cosProperties.getLocalPublicPath());
        Path uploadRoot = Paths.get(cosProperties.getLocalUploadDir()).toAbsolutePath().normalize();
        String resourceLocation = uploadRoot.toUri().toString();
        if (!resourceLocation.endsWith("/")) {
            resourceLocation = resourceLocation + "/";
        }
        registry.addResourceHandler(publicPath + "/**")
                .addResourceLocations(resourceLocation);
    }

    private String normalizePublicPath(String publicPath) {
        if (publicPath == null || publicPath.isBlank()) {
            return "/uploads";
        }
        String normalized = publicPath.trim();
        if (!normalized.startsWith("/")) {
            normalized = "/" + normalized;
        }
        return normalized.replaceAll("/+$", "");
    }
}
