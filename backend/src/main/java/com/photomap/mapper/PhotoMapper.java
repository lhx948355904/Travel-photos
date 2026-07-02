package com.photomap.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.photomap.entity.Photo;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface PhotoMapper extends BaseMapper<Photo> {

    @Select("SELECT * FROM photo WHERE user_id = #{userId} AND location_id = #{locationId} AND deleted = false AND status = 'approved' ORDER BY sort_order, created_at")
    List<Photo> selectByLocationId(@Param("userId") Long userId, @Param("locationId") Long locationId);

    @Select("SELECT COUNT(*) FROM photo WHERE user_id = #{userId} AND location_id = #{locationId} AND deleted = false AND status = 'approved'")
    int countByLocationId(@Param("userId") Long userId, @Param("locationId") Long locationId);

    @Select("SELECT * FROM photo WHERE id = #{id} AND user_id = #{userId} AND deleted = false LIMIT 1")
    Photo selectOwnedById(@Param("userId") Long userId, @Param("id") Long id);
}
