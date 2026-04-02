# Используем официальный образ Python
FROM python:3.12-slim

# Устанавливаем рабочую директорию внутри контейнера
WORKDIR /app

# Копируем файлы с зависимостями для их установки
# Это делается отдельным слоем для кэширования, что ускоряет сборку
COPY backend/requirements.txt ./backend/
COPY bot/requirements.txt ./bot/
# Копируем корневой requirements.txt, если он есть
COPY requirements.txt .

# Устанавливаем зависимости
RUN pip install --no-cache-dir -r backend/requirements.txt

# Копируем ВЕСЬ остальной код проекта в рабочую директорию
COPY . .

# Объявляем порт, который будет использовать приложение (Railway подставит переменную PORT)
ENV PORT=8000
EXPOSE $PORT

# Команда для запуска бэкенда
CMD cd backend && python -m uvicorn app:app --host 0.0.0.0 --port $PORT
