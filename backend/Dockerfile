# BaseCognos Backend - Baileys (sem Puppeteer/Chrome)
FROM node:18-bookworm-slim as global-deps-stage

WORKDIR /app

RUN apt-get update \
  && apt-get install -y nano ffmpeg \
  && rm -rf /var/lib/apt/lists/* \
  && npm install pm2@latest -g

ENV NODE_ENV=dev

FROM global-deps-stage as develop-stage
COPY package*.json ./
RUN npm install

FROM develop-stage as build-stage
COPY . .
RUN npm run build

FROM build-stage as development-stage
ENV NODE_ENV=development
ENTRYPOINT ["npm", "run", "dev:server"]

FROM build-stage as production-stage
ENV NODE_ENV=production
COPY docker-entrypoint.sh .
RUN chmod +x docker-entrypoint.sh
ENTRYPOINT ["./docker-entrypoint.sh"]
