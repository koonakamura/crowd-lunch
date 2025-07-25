FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

# Install Playwright dependencies for CI
RUN npx playwright install-deps

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "preview"]
