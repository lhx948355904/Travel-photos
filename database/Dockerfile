ARG PGVECTOR_IMAGE=pgvector/pgvector:0.8.2-pg15-bookworm
FROM ${PGVECTOR_IMAGE}

RUN apt-get update \
    && apt-get install -y --no-install-recommends postgresql-15-postgis-3 \
    && rm -rf /var/lib/apt/lists/*
