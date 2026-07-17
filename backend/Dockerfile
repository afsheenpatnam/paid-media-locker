FROM node:20-bookworm-slim AS base
WORKDIR /app

# sharp needs these at runtime on debian slim images
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm install --omit=dev=false

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY --from=base /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=base /app/dist ./dist
COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src

RUN mkdir -p storage/originals storage/previews

EXPOSE 4000
CMD npx prisma migrate deploy && npm run seed && node dist/server.js
