# EPUBCheck worker (TASK-0003): Node runs the poller, Java runs the official W3C EPUBCheck.
FROM node:22.21.1-bookworm-slim AS node

FROM eclipse-temurin:21-jre-noble
ARG EPUBCHECK_VERSION=5.4.0

COPY --from=node /usr/local/bin/node /usr/local/bin/node
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl unzip \
 && curl -fsSL -o /tmp/epubcheck.zip "https://github.com/w3c/epubcheck/releases/download/v${EPUBCHECK_VERSION}/epubcheck-${EPUBCHECK_VERSION}.zip" \
 && unzip -q /tmp/epubcheck.zip -d /opt \
 && mv "/opt/epubcheck-${EPUBCHECK_VERSION}" /opt/epubcheck \
 && rm /tmp/epubcheck.zip \
 && apt-get purge -y curl unzip && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY artifacts/epubcheck-worker/worker.mjs ./worker.mjs
USER ubuntu
CMD ["node", "worker.mjs"]
