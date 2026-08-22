FROM node:22-bookworm-slim
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
ENV NODE_ENV=production
ENV DATABASE_PATH=/data/app.db
VOLUME /data
EXPOSE 3000
# "start" runs the migration, then next start on $PORT (3000)
CMD ["pnpm", "start"]
