# Frontend Dockerfile - Multi-stage build
FROM node:20-alpine as build

# Встановлюємо робочу директорію
WORKDIR /app

# Копіюємо package.json та package-lock.json
COPY package*.json ./

# Встановлюємо залежності
RUN npm ci

# Копіюємо весь код
COPY . .

# Аргумент для API URL
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

# Будуємо застосунок
RUN npm run build

# Production stage
FROM nginx:alpine

# Копіюємо збудований застосунок
COPY --from=build /app/dist /usr/share/nginx/html

# Копіюємо конфігурацію nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Відкриваємо порт
EXPOSE 80

# Запускаємо nginx
CMD ["nginx", "-g", "daemon off;"]

