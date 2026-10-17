FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY elasticsearch ./elasticsearch
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start"]
