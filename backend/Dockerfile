FROM mcr.microsoft.com/playwright:v1.57.0-noble

RUN apt-get update && apt-get install -y ffmpeg

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
