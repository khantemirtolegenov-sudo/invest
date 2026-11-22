# Production-образ: один процесс — backend отдаёт и API, и собранный фронтенд.
# Сборка в два этапа: фронтенд собирается отдельно, в итоговый образ попадает только dist.

FROM node:22-alpine AS app-build
WORKDIR /src
COPY app/package*.json app/
RUN cd app && npm ci
COPY app/ app/
COPY scripts/ scripts/
COPY backend/src/db/collections.js backend/src/db/collections.js
COPY backend/src/db/tables/simple.js backend/src/db/tables/simple.js
RUN node scripts/check-acl.mjs && cd app && npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY backend/package*.json backend/
RUN cd backend && npm ci --omit=dev
COPY backend/ backend/
COPY --from=app-build /src/app/dist app/dist
ENV STATIC_DIR=../app/dist
RUN mkdir -p backend/uploads backend/backups && chown -R node:node /app
USER node
EXPOSE 5185
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:5185/api/health || exit 1
CMD ["node", "backend/src/server.js"]
