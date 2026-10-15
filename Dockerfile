FROM --platform=linux/amd64 node:24-slim
WORKDIR /app
RUN corepack enable
COPY . .
ENV HUSKY=0
RUN pnpm install --frozen-lockfile && pnpm build
ENV NODE_ENV=production
EXPOSE 8080
CMD ["pnpm", "start", "-p", "8080"]
