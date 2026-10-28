FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY server.mjs ./
ENV NODE_ENV=production
USER node
CMD ["node", "server.mjs"]
