FROM node:20-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV DATABASE_URL=file:/app/prisma/dev.db

COPY --from=build /app ./
RUN mkdir -p /app/prisma /app/output/reports

EXPOSE 3000

CMD ["sh", "-c", "npm run deploy:prepare && npm run start"]
