FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY . ./
RUN npm run build

CMD ["sh", "-c", "mkdir -p /output && rm -rf /output/* && cp -R dist/. /output/"]