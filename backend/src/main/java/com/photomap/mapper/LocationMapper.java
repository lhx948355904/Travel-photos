package com.photomap.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.photomap.entity.Location;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.util.List;

@Mapper
public interface LocationMapper extends BaseMapper<Location> {

    @Select("SELECT * FROM location WHERE user_id = #{userId} AND deleted = false " +
            "AND longitude BETWEEN #{minLng} AND #{maxLng} " +
            "AND latitude BETWEEN #{minLat} AND #{maxLat}")
    List<Location> selectByBbox(@Param("userId") Long userId,
                                @Param("minLng") Double minLng,
                                @Param("minLat") Double minLat,
                                @Param("maxLng") Double maxLng,
                                @Param("maxLat") Double maxLat);

    @Update("UPDATE location SET cover_photo_id = #{coverPhotoId} WHERE id = #{id}")
    int updateCoverPhoto(@Param("id") Long id, @Param("coverPhotoId") Long coverPhotoId);
}
