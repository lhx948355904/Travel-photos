package com.photomap.ai;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.photomap.config.AiProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "ai.provider", havingValue = "dashscope", matchIfMissing = true)
public class DashScopePhotoAiProvider implements PhotoAiProvider {

    private static final String CHAT_PATH = "/compatible-mode/v1/chat/completions";
    private static final String EMBEDDING_PATH =
            "/api/v1/services/embeddings/multimodal-embedding/multimodal-embedding";

    private final AiProperties properties;
    private final ObjectMapper objectMapper;

    @Override
    public boolean isAvailable() {
        return properties.isProviderReady();
    }

    @Override
    public PhotoAnalysis analyzePhoto(String imageInput, String context) {
        ensureAvailable();
        Map<String, Object> system = Map.of(
                "role", "system",
                "content", "你是旅行摄影归档助手。只描述图片中可以看见的内容，不猜测人物身份、精确地点或未提供的事实。"
                        + "必须输出 JSON：{\"caption\":\"一句中文客观描述\",\"tags\":[\"标签\"]}。"
        );
        List<Map<String, Object>> content = List.of(
                Map.of("type", "image_url", "image_url", Map.of("url", imageInput)),
                Map.of("type", "text", "text", "归档上下文：" + safe(context)
                        + "\n生成一条不超过80字的描述和3到8个短标签。")
        );
        Map<String, Object> user = Map.of("role", "user", "content", content);

        JsonNode response = post(CHAT_PATH, chatBody(properties.getVisionModel(), List.of(system, user)));
        JsonNode parsed = parseJsonObject(extractAssistantText(response));
        String caption = parsed.path("caption").asText("").trim();
        List<String> tags = new ArrayList<>();
        JsonNode tagNode = parsed.path("tags");
        if (tagNode.isArray()) {
            tagNode.forEach(item -> {
                String value = item.asText("").trim();
                if (StringUtils.hasText(value) && tags.size() < 8) {
                    tags.add(value);
                }
            });
        } else if (tagNode.isTextual()) {
            for (String value : tagNode.asText().split("[,，]")) {
                if (StringUtils.hasText(value) && tags.size() < 8) {
                    tags.add(value.trim());
                }
            }
        }
        if (!StringUtils.hasText(caption)) {
            throw new IllegalStateException("视觉模型未返回有效照片描述");
        }
        return new PhotoAnalysis(caption, tags);
    }

    @Override
    public float[] embedPhoto(String imageInput, String searchableText) {
        return embed(List.of(
                Map.of("image", imageInput),
                Map.of("text", safe(searchableText))
        ), true);
    }

    @Override
    public float[] embedQuery(String query) {
        return embed(List.of(Map.of("text", safe(query))), true);
    }

    @Override
    public GeneratedAnswer generateAnswer(String query, List<AnswerEvidence> evidence) {
        ensureAvailable();
        String evidenceJson;
        try {
            evidenceJson = objectMapper.writeValueAsString(evidence);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("无法序列化照片证据", e);
        }

        Map<String, Object> system = Map.of(
                "role", "system",
                "content", "你是旅行照片问答助手。只能依据提供的照片证据回答，不使用外部知识，不猜测。"
                        + "证据不足时明确说“现有照片不足以回答”。"
                        + "必须输出 JSON：{\"answer\":\"不超过120字\",\"citationPhotoIds\":[数字ID]}；"
                        + "citationPhotoIds 只能引用证据中真实存在且支持回答的 photoId。"
        );
        Map<String, Object> user = Map.of(
                "role", "user",
                "content", "问题：" + safe(query) + "\n照片证据：" + evidenceJson
        );
        JsonNode response = post(CHAT_PATH, chatBody(properties.getChatModel(), List.of(system, user)));
        JsonNode parsed = parseJsonObject(extractAssistantText(response));
        String answer = parsed.path("answer").asText("").trim();
        List<Long> citationIds = new ArrayList<>();
        JsonNode citations = parsed.path("citationPhotoIds");
        if (citations.isArray()) {
            citations.forEach(item -> {
                if (item.canConvertToLong()) {
                    citationIds.add(item.asLong());
                }
            });
        }
        if (!StringUtils.hasText(answer)) {
            throw new IllegalStateException("回答模型未返回有效内容");
        }
        return new GeneratedAnswer(answer, citationIds);
    }

    private float[] embed(List<Map<String, Object>> contents, boolean fusion) {
        ensureAvailable();
        Map<String, Object> parameters = new LinkedHashMap<>();
        parameters.put("dimension", properties.getEmbeddingDimension());
        parameters.put("output_type", "dense");
        parameters.put("enable_fusion", fusion);
        parameters.put("instruct", "Represent travel photos and Chinese queries for semantic photo retrieval.");

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", properties.getEmbeddingModel());
        body.put("input", Map.of("contents", contents));
        body.put("parameters", parameters);

        JsonNode response = post(EMBEDDING_PATH, body);
        JsonNode embeddings = response.path("output").path("embeddings");
        if (!embeddings.isArray() || embeddings.isEmpty()) {
            throw new IllegalStateException("向量模型未返回 embedding");
        }
        JsonNode vectorNode = embeddings.get(0).path("embedding");
        if (!vectorNode.isArray() || vectorNode.size() != properties.getEmbeddingDimension()) {
            throw new IllegalStateException("向量维度不符合配置");
        }
        float[] vector = new float[vectorNode.size()];
        for (int i = 0; i < vectorNode.size(); i++) {
            vector[i] = (float) vectorNode.get(i).asDouble();
        }
        return vector;
    }

    private Map<String, Object> chatBody(String model, List<Map<String, Object>> messages) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", model);
        body.put("messages", messages);
        body.put("temperature", 0.1);
        body.put("enable_thinking", false);
        body.put("response_format", Map.of("type", "json_object"));
        return body;
    }

    private JsonNode post(String path, Object body) {
        try {
            SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
            requestFactory.setConnectTimeout(Math.max(100, properties.getConnectTimeoutMs()));
            requestFactory.setReadTimeout(Math.max(100, properties.getReadTimeoutMs()));
            String raw = RestClient.builder()
                    .baseUrl(properties.getBaseUrl().replaceAll("/+$", ""))
                    .requestFactory(requestFactory)
                    .build()
                    .post()
                    .uri(path)
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("Authorization", "Bearer " + properties.getApiKey())
                    .body(body)
                    .retrieve()
                    .body(String.class);
            if (!StringUtils.hasText(raw)) {
                throw new IllegalStateException("百炼返回了空响应");
            }
            return objectMapper.readTree(raw);
        } catch (Exception e) {
            throw new IllegalStateException("百炼模型调用失败: " + e.getMessage(), e);
        }
    }

    private String extractAssistantText(JsonNode response) {
        JsonNode content = response.path("choices").path(0).path("message").path("content");
        if (content.isTextual()) {
            return content.asText();
        }
        if (content.isArray()) {
            for (JsonNode item : content) {
                if (item.hasNonNull("text")) {
                    return item.path("text").asText();
                }
            }
        }
        JsonNode dashScopeContent = response.path("output").path("choices").path(0)
                .path("message").path("content");
        if (dashScopeContent.isTextual()) {
            return dashScopeContent.asText();
        }
        if (dashScopeContent.isArray()) {
            for (JsonNode item : dashScopeContent) {
                if (item.hasNonNull("text")) {
                    return item.path("text").asText();
                }
            }
        }
        throw new IllegalStateException("无法解析模型文本响应");
    }

    private JsonNode parseJsonObject(String raw) {
        String normalized = raw == null ? "" : raw.trim();
        if (normalized.startsWith("```")) {
            normalized = normalized.replaceFirst("^```(?:json)?\\s*", "")
                    .replaceFirst("\\s*```$", "");
        }
        int start = normalized.indexOf('{');
        int end = normalized.lastIndexOf('}');
        if (start >= 0 && end >= start) {
            normalized = normalized.substring(start, end + 1);
        }
        try {
            JsonNode result = objectMapper.readTree(normalized);
            if (!result.isObject()) {
                throw new IllegalStateException("模型没有返回 JSON 对象");
            }
            return result;
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("模型 JSON 响应无效", e);
        }
    }

    private void ensureAvailable() {
        if (!isAvailable()) {
            throw new IllegalStateException("AI 未启用或 DASHSCOPE_API_KEY 未配置");
        }
    }

    private String safe(String value) {
        return value == null ? "" : value.trim();
    }
}
