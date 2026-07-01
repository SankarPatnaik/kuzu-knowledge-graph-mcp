FROM node:20-bookworm-slim AS build

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
RUN npm run build

FROM node:20-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production
ENV KUZU_DB_PATH=/data/kuzu-demo
ENV KUZU_AUTO_CREATE_SCHEMA=true
ENV KUZU_AUTO_SEED=true

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=build /app/dist ./dist
COPY README.md ./

VOLUME ["/data"]
CMD ["node", "dist/src/index.js"]

