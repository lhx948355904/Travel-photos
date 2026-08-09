package com.photomap.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.photomap.entity.BlogPost;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface BlogPostMapper extends BaseMapper<BlogPost> {

    @Select({"<script>",
            "SELECT COUNT(*) FROM blog_post WHERE user_id = #{userId} AND slug = #{slug}",
            "<if test='currentId != null'> AND id &lt;&gt; #{currentId}</if>",
            "</script>"})
    long countAnyBySlug(@Param("userId") Long userId,
                        @Param("slug") String slug,
                        @Param("currentId") Long currentId);
}
