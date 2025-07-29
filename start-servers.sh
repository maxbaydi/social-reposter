#!/bin/bash

# Скрипт для запуска всех серверов приложения в фоновом режиме
# Автор: AI Assistant
# Дата: $(date)

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для логирования
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ОШИБКА:${NC} $1"
}

warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] ПРЕДУПРЕЖДЕНИЕ:${NC} $1"
}

info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] ИНФО:${NC} $1"
}

# Проверка существования директорий
check_directories() {
    if [ ! -d "server" ]; then
        error "Директория 'server' не найдена!"
        exit 1
    fi
    
    if [ ! -d "front" ]; then
        error "Директория 'front' не найдена!"
        exit 1
    fi
}

# Проверка установленных зависимостей
check_dependencies() {
    if ! command -v node &> /dev/null; then
        error "Node.js не установлен!"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        error "npm не установлен!"
        exit 1
    fi
}

# Установка зависимостей
install_dependencies() {
    log "Установка зависимостей для сервера..."
    cd server
    if [ ! -d "node_modules" ]; then
        npm install
    fi
    cd ..
    
    log "Установка зависимостей для фронтенда..."
    cd front
    if [ ! -d "node_modules" ]; then
        npm install
    fi
    cd ..
}

# Остановка существующих процессов
stop_existing_processes() {
    log "Остановка существующих процессов..."
    
    # Остановка процессов на порту 5000 (сервер)
    if lsof -ti:5000 > /dev/null 2>&1; then
        lsof -ti:5000 | xargs kill -9
        log "Остановлен процесс на порту 5000"
    fi
    
    # Остановка процессов на порту 3000 (фронтенд)
    if lsof -ti:3000 > /dev/null 2>&1; then
        lsof -ti:3000 | xargs kill -9
        log "Остановлен процесс на порту 3000"
    fi
}

# Запуск сервера
start_server() {
    log "Запуск сервера на порту 5000..."
    cd server
    nohup npm start > ../logs/server.log 2>&1 &
    SERVER_PID=$!
    echo $SERVER_PID > ../logs/server.pid
    cd ..
    
    # Ждем немного для запуска сервера
    sleep 3
    
    # Проверяем, что сервер запустился
    if curl -s http://localhost:5000/api/auth > /dev/null 2>&1; then
        log "Сервер успешно запущен (PID: $SERVER_PID)"
    else
        warning "Сервер может быть еще не готов, проверьте логи в logs/server.log"
    fi
}

# Запуск фронтенда
start_frontend() {
    log "Запуск фронтенда на порту 3000..."
    cd front
    nohup npm run dev > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../logs/frontend.pid
    cd ..
    
    # Ждем немного для запуска фронтенда
    sleep 5
    
    # Проверяем, что фронтенд запустился
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        log "Фронтенд успешно запущен (PID: $FRONTEND_PID)"
    else
        warning "Фронтенд может быть еще не готов, проверьте логи в logs/frontend.log"
    fi
}

# Создание директории для логов
create_logs_directory() {
    if [ ! -d "logs" ]; then
        mkdir logs
        log "Создана директория logs"
    fi
}

# Основная функция
main() {
    log "Запуск приложения Reposter..."
    
    # Проверки
    check_directories
    check_dependencies
    
    # Создание директории для логов
    create_logs_directory
    
    # Остановка существующих процессов
    stop_existing_processes
    
    # Установка зависимостей
    install_dependencies
    
    # Запуск серверов
    start_server
    start_frontend
    
    log "Все серверы запущены в фоновом режиме!"
    log "Фронтенд доступен по адресу: http://localhost:3000"
    log "API сервер доступен по адресу: http://localhost:5000"
    log "Логи сервера: logs/server.log"
    log "Логи фронтенда: logs/frontend.log"
    log "PID файлы: logs/server.pid, logs/frontend.pid"
    
    echo ""
    echo "Для остановки серверов используйте: ./stop-servers.sh"
    echo "Для просмотра статуса: ./status-servers.sh"
}

# Запуск основной функции
main "$@" 