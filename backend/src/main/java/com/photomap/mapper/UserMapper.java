package com.photomap.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.photomap.entity.AppUser;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface UserMapper extends BaseMapper<AppUser> {

    @Select("SELECT * FROM app_user WHERE username = #{username} AND deleted = false LIMIT 1")
    AppUser selectByUsername(@Param("username") String username);
}
