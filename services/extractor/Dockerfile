FROM ghcr.io/puppeteer/puppeteer:latest

WORKDIR /app

COPY package.json ./
RUN npm install

RUN ls -la
COPY . .

EXPOSE 3005

CMD ["node", "server.js"]