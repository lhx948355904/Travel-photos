package com.photomap.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.photomap.config.AiProperties;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DashScopePhotoAiProviderTest {

    private HttpServer server;

    @AfterEach
    void stopServer() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    void parsesSuccessfulVisionJson() throws Exception {
        String assistantJson = "{\"caption\":\"橙色夕阳落在海面上\",\"tags\":[\"海边\",\"日落\"]}";
        String response = new ObjectMapper().writeValueAsString(
                java.util.Map.of("choices", List.of(java.util.Map.of(
                        "message", java.util.Map.of("content", assistantJson)
                )))
        );
        DashScopePhotoAiProvider provider = providerWithResponse(200, response, 0);

        PhotoAiProvider.PhotoAnalysis result =
                provider.analyzePhoto("https://example.test/photo.jpg", "厦门");

        assertThat(result.caption()).isEqualTo("橙色夕阳落在海面上");
        assertThat(result.tags()).containsExactly("海边", "日落");
    }

    @Test
    void rejectsInvalidModelJson() throws Exception {
        String response = new ObjectMapper().writeValueAsString(
                java.util.Map.of("choices", List.of(java.util.Map.of(
                        "message", java.util.Map.of("content", "not-json")
                )))
        );
        DashScopePhotoAiProvider provider = providerWithResponse(200, response, 0);

        assertThatThrownBy(() ->
                provider.analyzePhoto("https://example.test/photo.jpg", "厦门"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("JSON");
    }

    @Test
    void surfacesProviderRateLimit() throws Exception {
        DashScopePhotoAiProvider provider =
                providerWithResponse(429, "{\"message\":\"rate limited\"}", 0);

        assertThatThrownBy(() ->
                provider.generateAnswer("问题", List.of()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("百炼模型调用失败");
    }

    @Test
    void stopsWaitingAfterConfiguredReadTimeout() throws Exception {
        DashScopePhotoAiProvider provider =
                providerWithResponse(200, "{\"choices\":[]}", 400);

        assertThatThrownBy(() ->
                provider.generateAnswer("问题", List.of()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("百炼模型调用失败");
    }

    private DashScopePhotoAiProvider providerWithResponse(int status,
                                                          String response,
                                                          long delayMillis) throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", exchange -> writeResponse(exchange, status, response, delayMillis));
        server.start();

        AiProperties properties = new AiProperties();
        properties.setEnabled(true);
        properties.setApiKey("test-key");
        properties.setBaseUrl("http://127.0.0.1:" + server.getAddress().getPort());
        properties.setConnectTimeoutMs(100);
        properties.setReadTimeoutMs(100);
        return new DashScopePhotoAiProvider(properties, new ObjectMapper());
    }

    private void writeResponse(HttpExchange exchange,
                               int status,
                               String response,
                               long delayMillis) throws IOException {
        try {
            if (delayMillis > 0) {
                Thread.sleep(delayMillis);
            }
            byte[] body = response.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(status, body.length);
            exchange.getResponseBody().write(body);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } finally {
            exchange.close();
        }
    }
}
