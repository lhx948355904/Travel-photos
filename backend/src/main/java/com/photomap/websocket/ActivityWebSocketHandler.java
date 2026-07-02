package com.photomap.websocket;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@RequiredArgsConstructor
public class ActivityWebSocketHandler extends TextWebSocketHandler {

    private static final int MAX_CONTENT_LENGTH = 120;

    private final ObjectMapper objectMapper;
    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        sessions.put(session.getId(), session);
        sendEvent(session, "connected", "Connected to the live map channel");
        broadcast("visitor-joined", "A visitor opened the travel map");
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        Map<String, Object> payload = readPayload(message.getPayload());
        String type = String.valueOf(payload.getOrDefault("type", "activity"));

        if ("ping".equals(type)) {
            sendEvent(session, "pong", "Connection is healthy");
            return;
        }

        String content = normalizeContent(payload.get("content"));
        if (content.isBlank()) {
            content = "A visitor is viewing the travel map";
        }
        broadcast("activity", content);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        if (sessions.remove(session.getId()) != null) {
            broadcast("visitor-left", "A visitor left the travel map");
        }
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        boolean removed = sessions.remove(session.getId()) != null;
        if (session.isOpen()) {
            session.close(CloseStatus.SERVER_ERROR);
        }
        if (removed) {
            broadcast("visitor-left", "A visitor connection closed unexpectedly");
        }
    }

    private Map<String, Object> readPayload(String json) {
        try {
            return objectMapper.readValue(json, new TypeReference<>() {
            });
        } catch (Exception ignored) {
            return Map.of("type", "activity", "content", json);
        }
    }

    private String normalizeContent(Object rawContent) {
        if (rawContent == null) {
            return "";
        }
        String content = String.valueOf(rawContent).trim();
        if (content.length() <= MAX_CONTENT_LENGTH) {
            return content;
        }
        return content.substring(0, MAX_CONTENT_LENGTH) + "...";
    }

    private void broadcast(String type, String content) {
        sessions.values().forEach(session -> sendEvent(session, type, content));
    }

    private void sendEvent(WebSocketSession session, String type, String content) {
        if (!session.isOpen()) {
            return;
        }

        try {
            String json = objectMapper.writeValueAsString(Map.of(
                    "type", type,
                    "content", content,
                    "onlineCount", sessions.size(),
                    "timestamp", Instant.now().toString()
            ));
            synchronized (session) {
                session.sendMessage(new TextMessage(json));
            }
        } catch (IOException ignored) {
            sessions.remove(session.getId());
        }
    }
}
