# Инструкции по развертыванию Reposter

## Быстрый старт

### 1. Клонирование репозитория
```bash
git clone https://github.com/maxbaydi/social-reposter.git
cd social-reposter
```

### 2. Установка зависимостей
```bash
# Установка зависимостей для сервера
cd server
npm install
cd ..

# Установка зависимостей для фронтенда
cd front
npm install
cd ..
```

### 3. Настройка окружения
```bash
# Копируем пример файла окружения
cp server/.env.example server/.env

# Редактируем настройки
nano server/.env
```

### 4. Запуск приложения
```bash
# Делаем скрипты исполняемыми
chmod +x *.sh

# Запускаем все серверы
./start-servers.sh
```

## Настройка окружения

### Переменные окружения (server/.env)
```env
# Порт сервера
PORT=5000

# Секретный ключ для JWT
JWT_SECRET=your-secret-key-here

# Настройки базы данных (SQLite используется по умолчанию)
DB_DIALECT=sqlite
DB_STORAGE=./database.sqlite

# Настройки почты (опционально)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Настройки VK API (опционально)
VK_API_KEY=your-vk-api-key
```

## Управление серверами

### Основные команды
```bash
# Запуск всех серверов
./start-servers.sh

# Остановка всех серверов
./stop-servers.sh

# Перезапуск серверов
./restart-servers.sh

# Проверка статуса
./status-servers.sh
```

### Диагностика и исправление
```bash
# Диагностика проблем с постами
./fix-posts-progress.sh

# Автоматическое исправление прогресса задач
./fix-progress.sh
```

## Структура проекта

```
social-reposter/
├── front/                 # React фронтенд
│   ├── src/              # Исходный код
│   ├── dist/             # Сборка (автоматически)
│   └── package.json      # Зависимости фронтенда
├── server/               # Express.js backend
│   ├── src/              # Исходный код сервера
│   ├── migrations/       # Миграции базы данных
│   ├── .env              # Переменные окружения
│   └── package.json      # Зависимости сервера
├── logs/                 # Логи серверов (автоматически)
├── *.sh                  # Скрипты управления
├── README.md             # Основная документация
├── README-SERVERS.md     # Документация по серверам
└── DEPLOYMENT.md         # Этот файл
```

## Требования

### Системные требования
- **Node.js** версии 14 или выше
- **npm** или **yarn**
- **Git**
- **Linux/Unix** система (для скриптов)

### Проверка требований
```bash
# Проверка версии Node.js
node --version

# Проверка версии npm
npm --version

# Проверка Git
git --version
```

## Развертывание в продакшене

### 1. Подготовка сервера
```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Установка PM2 для управления процессами
sudo npm install -g pm2
```

### 2. Настройка PM2
```bash
# Создание конфигурации PM2
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'reposter-server',
      script: './server/src/server.js',
      cwd: './server',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    },
    {
      name: 'reposter-frontend',
      script: 'npm',
      args: 'run preview',
      cwd: './front',
      env: {
        NODE_ENV: 'production'
      },
      instances: 1,
      autorestart: true,
      watch: false
    }
  ]
};
EOF
```

### 3. Сборка и запуск
```bash
# Сборка фронтенда
cd front
npm run build
cd ..

# Запуск через PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 4. Настройка Nginx (опционально)
```bash
# Установка Nginx
sudo apt install nginx

# Создание конфигурации
sudo nano /etc/nginx/sites-available/reposter
```

Пример конфигурации Nginx:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Мониторинг и логи

### Просмотр логов
```bash
# Логи сервера
tail -f logs/server.log

# Логи фронтенда
tail -f logs/frontend.log

# Логи PM2
pm2 logs
```

### Мониторинг процессов
```bash
# Статус PM2 процессов
pm2 status

# Мониторинг ресурсов
pm2 monit
```

## Резервное копирование

### База данных
```bash
# Создание резервной копии
cp server/database.sqlite backup/database_$(date +%Y%m%d_%H%M%S).sqlite

# Восстановление из резервной копии
cp backup/database_20250101_120000.sqlite server/database.sqlite
```

### Автоматическое резервное копирование
```bash
# Добавление в crontab
crontab -e

# Добавить строку для ежедневного резервного копирования
0 2 * * * /path/to/backup-script.sh
```

## Устранение неполадок

### Частые проблемы

1. **Порт занят**
   ```bash
   # Поиск процесса
   lsof -ti:5000
   # Остановка процесса
   kill -9 $(lsof -ti:5000)
   ```

2. **Проблемы с правами доступа**
   ```bash
   # Исправление прав
   chmod +x *.sh
   chmod 644 server/.env
   ```

3. **Проблемы с зависимостями**
   ```bash
   # Переустановка зависимостей
   rm -rf node_modules package-lock.json
   npm install
   ```

### Получение помощи
- Проверьте логи: `./status-servers.sh`
- Запустите диагностику: `./fix-posts-progress.sh`
- Создайте issue на GitHub с описанием проблемы 