package com.photomap.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.photomap.entity.Photo;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface PhotoMapper extends BaseMapper<Photo> {

    @Select("SELECT * FROM photo WHERE location_id = #{locationId} AND deleted = false ORDER BY sort_order, created_at")
    List<Photo> selectByLocationId(@Param("locationId") Long locationId);

    @Select("SELECT COUNT(*) FROM photo WHERE location_id = #{locationId} AND deleted = false")
    int countByLocationId(@Param("locationId") Long locationId);
}
