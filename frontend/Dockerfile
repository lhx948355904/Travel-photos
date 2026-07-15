# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
ARG VITE_API_BASE=/api
ARG VITE_AMAP_KEY
ARG VITE_AMAP_SECURITY_CODE
ENV VITE_API_BASE=${VITE_API_BASE}
ENV VITE_AMAP_KEY=${VITE_AMAP_KEY}
ENV VITE_AMAP_SECURITY_CODE=${VITE_AMAP_SECURITY_CODE}
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Run stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
