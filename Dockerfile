FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --chown=node:node db ./db
COPY --chown=node:node server ./server
COPY --chown=node:node public ./public
COPY --chown=node:node --from=build /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=4173

EXPOSE 4173

USER node

CMD ["npm", "start"]
