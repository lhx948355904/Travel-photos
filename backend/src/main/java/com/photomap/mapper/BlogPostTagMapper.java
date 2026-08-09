package com.photomap.mapper;

import com.photomap.entity.BlogTag;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface BlogPostTagMapper {

    @Delete("DELETE FROM blog_post_tag WHERE post_id = #{postId}")
    int deleteByPostId(@Param("postId") Long postId);

    @Insert("INSERT INTO blog_post_tag (post_id, tag_id) VALUES (#{postId}, #{tagId})")
    int insertRelation(@Param("postId") Long postId, @Param("tagId") Long tagId);

    @Select("SELECT tag_id FROM blog_post_tag WHERE post_id = #{postId}")
    List<Long> selectTagIdsByPostId(@Param("postId") Long postId);

    @Select("SELECT post_id FROM blog_post_tag WHERE tag_id = #{tagId}")
    List<Long> selectPostIdsByTagId(@Param("tagId") Long tagId);

    @Select("SELECT t.* FROM blog_tag t " +
            "JOIN blog_post_tag pt ON pt.tag_id = t.id " +
            "WHERE pt.post_id = #{postId} ORDER BY t.name")
    List<BlogTag> selectTagsByPostId(@Param("postId") Long postId);
}
