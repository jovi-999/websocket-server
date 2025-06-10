FROM node:lts-alpine AS builder

WORKDIR /app
COPY package*.json /app
RUN npm install


FROM node:lts-alpine

WORKDIR /app

COPY --from=builder /app/node_modules /app/node_modules

CMD ["sh"]
