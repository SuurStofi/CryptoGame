# Backend Dockerfile
FROM node:20-alpine

# Встановлюємо робочу директорію
WORKDIR /app

# Копіюємо package.json та package-lock.json
COPY package*.json ./

# Встановлюємо залежності
RUN npm ci --only=production --verbose

# Копіюємо весь код
COPY . .

# Відкриваємо порт
EXPOSE 3001

# Запускаємо застосунок
CMD ["npm", "start"]

