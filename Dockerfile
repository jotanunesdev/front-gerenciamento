FROM node:22-slim AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm config set strict-ssl false && npm install

FROM node:22-slim AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=5173

COPY package.json package-lock.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY public ./public

EXPOSE 5173

CMD ["npm", "run", "start"]
