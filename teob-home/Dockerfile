# Built by CI with the repository root as context: docker build -f teob-home/Dockerfile .
FROM node:22-alpine AS build
RUN apk add --no-cache python3 make g++
RUN corepack enable
WORKDIR /build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY tsconfig.json ./
COPY src ./src
RUN pnpm run build && pnpm prune --prod

FROM node:22-alpine
ARG BUILD_VERSION=dev
LABEL io.hass.name="TEOB Home" \
      io.hass.description="Event-sourced smart-home brain" \
      io.hass.type="addon" \
      io.hass.version="${BUILD_VERSION}"
WORKDIR /app
COPY --from=build /build/node_modules ./node_modules
COPY --from=build /build/dist ./dist
COPY package.json ./
ENV NODE_ENV=production
CMD ["node", "dist/main.js"]
