FROM node:20-bookworm-slim

WORKDIR /app

# Prisma requires OpenSSL libraries in the runtime image.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --include=dev

COPY . .

# Generate Prisma Client at build time; do not modify the database during deployment.
RUN npx prisma generate

# Keep only runtime dependencies in the final image.
RUN npm prune --omit=dev

ENV NODE_ENV=production

EXPOSE 8080
CMD ["npm", "start"]
