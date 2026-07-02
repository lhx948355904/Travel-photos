package com.photomap.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.photomap.dto.SearchPhotoVO;
import com.photomap.entity.PhotoEmbedding;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Result;
import org.apache.ibatis.annotations.Results;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface PhotoEmbeddingMapper extends BaseMapper<PhotoEmbedding> {

    @Delete("DELETE FROM photo_embedding WHERE photo_id = #{photoId}")
    int deleteByPhotoId(@Param("photoId") Long photoId);

    @Results(id = "SearchPhotoResultMap", value = {
            @Result(property = "photoId", column = "photo_id"),
            @Result(property = "locationId", column = "location_id"),
            @Result(property = "locationName", column = "location_name"),
            @Result(property = "url", column = "url"),
            @Result(property = "thumbUrl", column = "thumb_url"),
            @Result(property = "shotDate", column = "shot_date"),
            @Result(property = "caption", column = "caption"),
            @Result(property = "tags", column = "tags"),
            @Result(property = "score", column = "score")
    })
    @Select("""
            SELECT
                p.id AS photo_id,
                l.id AS location_id,
                l.name AS location_name,
                p.url AS url,
                p.thumb_url AS thumb_url,
                CAST(p.shot_date AS VARCHAR) AS shot_date,
                pe.caption AS caption,
                pe.tags AS tags,
                1.0 AS score
            FROM photo_embedding pe
            JOIN photo p ON p.id = pe.photo_id
            JOIN location l ON l.id = pe.location_id
            WHERE pe.user_id = #{userId}
              AND p.user_id = #{userId}
              AND l.user_id = #{userId}
              AND p.deleted = false
              AND l.deleted = false
              AND p.status = 'approved'
              AND LOWER(pe.search_text) LIKE CONCAT('%', LOWER(#{query}), '%')
            ORDER BY p.created_at DESC
            LIMIT #{limit}
            """)
    List<SearchPhotoVO> searchPhotos(@Param("userId") Long userId,
                                     @Param("query") String query,
                                     @Param("limit") Integer limit);
}
