FROM node:24-alpine
WORKDIR /lab
COPY package*.json ./
RUN npm ci --omit=dev
COPY service.mjs .
USER node
CMD ["node", "service.mjs"]
