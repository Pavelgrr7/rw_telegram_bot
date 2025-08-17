# Шаг 1: Используем официальный легковесный образ Node.js
# 'alpine' - это минимальная версия Linux, что делает образ очень маленьким
FROM node:18-alpine

# Устанавливаем рабочую директорию внутри контейнера
WORKDIR /usr/src/app

# Копируем package.json и package-lock.json
# npm install не будет запускаться при каждой сборке.
COPY package*.json ./

# Зависимости
# 'npm ci' предпочтительнее, т.к. он использует package-lock.json
# и гарантирует точное совпадение версий.
RUN npm ci --only=production

# Копируем код проекта в контейнер
COPY . .

# TypeScript в JavaScript
RUN npm run build

# Шаг 7: Указываем команду для запуска бота, когда контейнер стартует
# 'dist/bot.js' - это путь к главному файлу после сборки.
CMD [ "node", "dist/bot.js" ]