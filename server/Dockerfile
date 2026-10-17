FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

ENV NODE_ENV=production
ENV PORT=8787
ENV TCB_RUN=1
EXPOSE 8787

# 云托管会注入 PORT；本地/容器统一监听
CMD ["npx", "tsx", "src/cloudrun.ts"]
