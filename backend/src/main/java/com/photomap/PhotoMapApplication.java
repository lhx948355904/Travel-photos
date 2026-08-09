package com.photomap;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@MapperScan("com.photomap.mapper")
@EnableScheduling
public class PhotoMapApplication {
    public static void main(String[] args) {
        SpringApplication.run(PhotoMapApplication.class, args);
    }
}
