# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
# Next.js expects public at runtime; ensure it exists (project may not have public/)
RUN mkdir -p public
RUN npm run build

# Run stage (minimal image)
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Cloud Run uses PORT env; Next standalone respects it
CMD ["node", "server.js"]
