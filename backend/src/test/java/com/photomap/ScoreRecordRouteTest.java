package com.photomap;

import com.photomap.service.JwtService;
import com.photomap.service.SiteOwnerService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:score-route;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1;INIT=RUNSCRIPT FROM 'classpath:schema-h2.sql'",
        "spring.sql.init.mode=never",
        "spring.flyway.enabled=false",
        "cos.local-upload-enabled=true",
        "cos.local-upload-dir=target/test-score-uploads",
        "thrift.server.enabled=false"
})
@AutoConfigureMockMvc
class ScoreRecordRouteTest {
    @Autowired private MockMvc mockMvc;
    @Autowired private JwtService jwtService;
    @Autowired private SiteOwnerService ownerService;

    private String adminToken() {
        return "Bearer " + jwtService.createToken(ownerService.getOwnerId(), "admin", 3600);
    }

    private String input(String title, int first, int second) {
        return """
                {"title":"%s","playerOne":"阿明","playerTwo":"小林", "scoreOne":%d,"scoreTwo":%d,
                 "playedAt":"2026-10-24T18:30:00","venue":"A 台","note":"精彩一局"}
                """.formatted(title, first, second);
    }

    @Test
    void visitorsCanReadButCannotChangeScores() throws Exception {
        mockMvc.perform(get("/api/scores"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0));
        mockMvc.perform(get("/api/scores/capabilities"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.maxImagesPerRecord").value(20));
        mockMvc.perform(get("/api/scores/gallery"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0));
        mockMvc.perform(post("/api/admin/scores").contentType(MediaType.APPLICATION_JSON)
                        .content(input("公开赛", 5, 3)))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(put("/api/admin/scores/1").contentType(MediaType.APPLICATION_JSON)
                        .content(input("公开赛", 5, 3)))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(delete("/api/admin/scores/1"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/admin/scores/image"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/admin/scores/gallery").contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void adminCanCreateFilterUpdateAndDeleteWithoutImage() throws Exception {
        String token = adminToken();
        String body = mockMvc.perform(post("/api/admin/scores")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(input("周五友谊赛", 5, 3)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.imageUrl").isEmpty())
                .andReturn().getResponse().getContentAsString();
        long id = new com.fasterxml.jackson.databind.ObjectMapper()
                .readTree(body).path("data").path("id").asLong();

        mockMvc.perform(get("/api/scores").param("q", "周五").param("month", "2026-10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[0].scoreOne").value(5));
        mockMvc.perform(put("/api/admin/scores/{id}", id).header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(input("周五友谊赛", 5, 4).replace("\"venue\":\"A 台\"", "\"venue\":\"\"")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.scoreTwo").value(4))
                .andExpect(jsonPath("$.data.venue").isEmpty());
        mockMvc.perform(get("/api/scores").param("q", "周五"))
                .andExpect(jsonPath("$.data.items[0].venue").isEmpty());
        mockMvc.perform(delete("/api/admin/scores/{id}", id).header("Authorization", token))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/scores").param("q", "周五"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.total").value(0));
    }

    @Test
    void rejectsZeroZeroAndForeignImageKey() throws Exception {
        String token = adminToken();
        mockMvc.perform(post("/api/admin/scores").header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON).content(input("测试", 0, 0)))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/admin/scores").header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(input("测试", 1, 0).replace("\"note\":\"精彩一局\"", "\"imageKey\":\"users/999/scores/fake.png\"")))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/admin/scores").header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(input("测试", 1, 0).replace("\"note\":\"精彩一局\"",
                                "\"imageKeys\":[\"users/999/scores/fake.png\"]")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void uploadedImageCanBeShownThenRemoved() throws Exception {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB), "png", bytes);
        MockMultipartFile file = new MockMultipartFile("file", "score.png", "image/png", bytes.toByteArray());
        String token = adminToken();
        String uploadBody = mockMvc.perform(multipart("/api/admin/scores/image")
                        .file(file).header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.cosKey").isNotEmpty())
                .andReturn().getResponse().getContentAsString();
        String key = new com.fasterxml.jackson.databind.ObjectMapper()
                .readTree(uploadBody).path("data").path("cosKey").asText();
        String created = mockMvc.perform(post("/api/admin/scores").header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(input("图片测试赛", 2, 1)
                                .replace("\"note\":\"精彩一局\"", "\"imageKey\":\"" + key + "\"")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.imageUrl").isNotEmpty())
                .andReturn().getResponse().getContentAsString();
        long id = new com.fasterxml.jackson.databind.ObjectMapper()
                .readTree(created).path("data").path("id").asLong();
        mockMvc.perform(put("/api/admin/scores/{id}", id).header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON).content(input("图片测试赛", 2, 1)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.imageUrl").isEmpty());
        mockMvc.perform(get("/api/scores").param("q", "图片测试赛"))
                .andExpect(jsonPath("$.data.items[0].imageUrl").isEmpty());
    }

    @Test
    void multipleImagesAreReturnedInOrderAndCanBeRemovedIndividually() throws Exception {
        String token = adminToken();
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(3, 2, BufferedImage.TYPE_INT_RGB), "png", bytes);
        var mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        String firstUpload = mockMvc.perform(multipart("/api/admin/scores/image")
                        .file(new MockMultipartFile("file", "one.png", "image/png", bytes.toByteArray()))
                        .header("Authorization", token))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String secondUpload = mockMvc.perform(multipart("/api/admin/scores/image")
                        .file(new MockMultipartFile("file", "two.png", "image/png", bytes.toByteArray()))
                        .header("Authorization", token))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String firstKey = mapper.readTree(firstUpload).path("data").path("cosKey").asText();
        String secondKey = mapper.readTree(secondUpload).path("data").path("cosKey").asText();
        String imageKeys = "\"imageKeys\":[\"" + firstKey + "\",\"" + secondKey + "\"]";
        String created = mockMvc.perform(post("/api/admin/scores").header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(input("多图比赛", 2, 1).replace("\"note\":\"精彩一局\"", imageKeys)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.images.length()").value(2))
                .andExpect(jsonPath("$.data.images[0].imageKey").value(firstKey))
                .andExpect(jsonPath("$.data.images[1].imageKey").value(secondKey))
                .andReturn().getResponse().getContentAsString();
        long id = mapper.readTree(created).path("data").path("id").asLong();
        mockMvc.perform(get("/api/scores").param("q", "多图比赛"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[0].images.length()").value(2))
                .andExpect(jsonPath("$.data.items[0].images[1].imageKey").value(secondKey));
        mockMvc.perform(put("/api/admin/scores/{id}", id).header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(input("多图比赛", 2, 1).replace("\"note\":\"精彩一局\"",
                                "\"imageKeys\":[\"" + secondKey + "\"]")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.images.length()").value(1))
                .andExpect(jsonPath("$.data.images[0].imageKey").value(secondKey));
    }

    @Test
    void standaloneGalleryPhotosCanBeCreatedListedAndDeletedWithoutScore() throws Exception {
        String token = adminToken();
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(4, 3, BufferedImage.TYPE_INT_RGB), "png", bytes);
        var mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        String firstUpload = mockMvc.perform(multipart("/api/admin/scores/image")
                        .file(new MockMultipartFile("file", "gallery-one.png", "image/png", bytes.toByteArray()))
                        .header("Authorization", token))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String secondUpload = mockMvc.perform(multipart("/api/admin/scores/image")
                        .file(new MockMultipartFile("file", "gallery-two.png", "image/png", bytes.toByteArray()))
                        .header("Authorization", token))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String firstKey = mapper.readTree(firstUpload).path("data").path("cosKey").asText();
        String secondKey = mapper.readTree(secondUpload).path("data").path("cosKey").asText();
        String input = """
                {"title":"忘记比分的练习赛","playedAt":"2026-10-26T20:30:00",
                 "note":"只留下了现场照片","imageKeys":["%s","%s"]}
                """.formatted(firstKey, secondKey);

        String created = mockMvc.perform(post("/api/admin/scores/gallery")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(input))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.images.length()").value(2))
                .andReturn().getResponse().getContentAsString();
        long id = mapper.readTree(created).path("data").path("id").asLong();

        mockMvc.perform(get("/api/scores/gallery"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].title").value("忘记比分的练习赛"))
                .andExpect(jsonPath("$.data[0].images[1].imageKey").value(secondKey));

        mockMvc.perform(delete("/api/admin/scores/gallery/{id}", id)
                        .header("Authorization", token))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/scores/gallery"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(0));
    }

    @Test
    void frameScoresDriveChartsAndMustMatchMatchScore() throws Exception {
        String token = adminToken();
        String frames = "\"frames\":[{\"pointsOne\":75,\"pointsTwo\":42},"
                + "{\"pointsOne\":31,\"pointsTwo\":69},"
                + "{\"pointsOne\":81,\"pointsTwo\":13}]";
        String valid = input("逐局测试赛", 2, 1)
                .replace("\"note\":\"精彩一局\"", frames);
        mockMvc.perform(post("/api/admin/scores").header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(input("不匹配", 3, 0).replace("\"note\":\"精彩一局\"", frames)))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/admin/scores").header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(input("平局单局", 1, 0).replace("\"note\":\"精彩一局\"",
                                "\"frames\":[{\"pointsOne\":50,\"pointsTwo\":50}]")))
                .andExpect(status().isBadRequest());

        String created = mockMvc.perform(post("/api/admin/scores").header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON).content(valid))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.frames.length()").value(3))
                .andReturn().getResponse().getContentAsString();
        long id = new com.fasterxml.jackson.databind.ObjectMapper()
                .readTree(created).path("data").path("id").asLong();
        mockMvc.perform(get("/api/scores").param("q", "逐局测试赛"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[0].frames[1].pointsTwo").value(69));
        mockMvc.perform(put("/api/admin/scores/{id}", id).header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON).content(input("逐局测试赛", 2, 1)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.frames.length()").value(0));
    }
}
