# -- Build stage --
FROM node:24-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ENV NUXT_PUBLIC_BACKEND_MODE=server
RUN npm run build

# -- Production stage --
FROM node:24-alpine

WORKDIR /app

COPY --from=build /app/.output .output

# SQLite data directory
RUN mkdir -p /data && chown node:node /data

ENV NODE_ENV=production
ENV NUXT_PUBLIC_BACKEND_MODE=server
ENV NUXT_DB_PATH=/data/tend.db

EXPOSE 3000

USER node

CMD ["node", ".output/server/index.mjs"]
