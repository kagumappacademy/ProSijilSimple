FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN npm install --no-audit --no-fund
COPY client ./client
COPY server ./server
RUN npm run build

FROM node:22-bookworm-slim
ENV NODE_ENV=production PORT=4000 DATA_DIR=/app/server/data
WORKDIR /app
COPY --from=build /app /app
RUN mkdir -p /app/server/data && chown -R node:node /app
USER node
EXPOSE 4000
CMD ["npm","start"]
