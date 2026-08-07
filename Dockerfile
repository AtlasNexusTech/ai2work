# syntax = docker/dockerfile:1

FROM node:20-slim

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN corepack enable && corepack prepare pnpm@10.0.0 --activate

WORKDIR /app

# Install dependencies
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/
COPY packages/types/package.json packages/types/
RUN pnpm install --no-frozen-lockfile

# Copy source
COPY . .

# Build
RUN pnpm --filter @atlasnexus/aijobs-types build
RUN pnpm --filter @atlasnexus/aijobs-web build

EXPOSE 3000
CMD ["pnpm", "--filter", "@atlasnexus/aijobs-web", "start"]
