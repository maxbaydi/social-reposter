#!/bin/bash

# Скрипт для проверки статуса всех серверов приложения
# Автор: AI Assistant

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

# Проверка статуса сервера
check_server_status() {
    echo "=== СТАТУС СЕРВЕРА (Порт 5000) ==="
    
    # Проверка по PID файлу
    if [ -f "logs/server.pid" ]; then
        SERVER_PID=$(cat logs/server.pid)
        if ps -p $SERVER_PID > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Сервер запущен (PID: $SERVER_PID)${NC}"
            
            # Получение информации о процессе
            PROCESS_INFO=$(ps -p $SERVER_PID -o pid,ppid,cmd,etime --no-headers)
            echo "  Информация о процессе: $PROCESS_INFO"
        else
            echo -e "${RED}✗ Сервер не запущен (PID файл устарел)${NC}"
        fi
    else
        echo -e "${YELLOW}? PID файл сервера не найден${NC}"
    fi
    
    # Проверка по порту
    if lsof -ti:5000 > /dev/null 2>&1; then
        PORT_PID=$(lsof -ti:5000)
        echo -e "${GREEN}✓ Порт 5000 занят процессом (PID: $PORT_PID)${NC}"
    else
        echo -e "${RED}✗ Порт 5000 свободен${NC}"
    fi
    
    # Проверка доступности API
    if curl -s http://localhost:5000/api/auth > /dev/null 2>&1; then
        echo -e "${GREEN}✓ API сервер отвечает${NC}"
    else
        echo -e "${RED}✗ API сервер не отвечает${NC}"
    fi
    
    echo ""
}

# Проверка статуса фронтенда
check_frontend_status() {
    echo "=== СТАТУС ФРОНТЕНДА (Порт 3000) ==="
    
    # Проверка по PID файлу
    if [ -f "logs/frontend.pid" ]; then
        FRONTEND_PID=$(cat logs/frontend.pid)
        if ps -p $FRONTEND_PID > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Фронтенд запущен (PID: $FRONTEND_PID)${NC}"
            
            # Получение информации о процессе
            PROCESS_INFO=$(ps -p $FRONTEND_PID -o pid,ppid,cmd,etime --no-headers)
            echo "  Информация о процессе: $PROCESS_INFO"
        else
            echo -e "${RED}✗ Фронтенд не запущен (PID файл устарел)${NC}"
        fi
    else
        echo -e "${YELLOW}? PID файл фронтенда не найден${NC}"
    fi
    
    # Проверка по порту
    if lsof -ti:3000 > /dev/null 2>&1; then
        PORT_PID=$(lsof -ti:3000)
        echo -e "${GREEN}✓ Порт 3000 занят процессом (PID: $PORT_PID)${NC}"
    else
        echo -e "${RED}✗ Порт 3000 свободен${NC}"
    fi
    
    # Проверка доступности фронтенда
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Фронтенд отвечает${NC}"
    else
        echo -e "${RED}✗ Фронтенд не отвечает${NC}"
    fi
    
    echo ""
}

# Проверка логов
check_logs() {
    echo "=== ПОСЛЕДНИЕ ЛОГИ ==="
    
    # Логи сервера
    if [ -f "logs/server.log" ]; then
        echo "Последние 5 строк логов сервера:"
        tail -5 logs/server.log | sed 's/^/  /'
    else
        echo -e "${YELLOW}Файл логов сервера не найден${NC}"
    fi
    
    echo ""
    
    # Логи фронтенда
    if [ -f "logs/frontend.log" ]; then
        echo "Последние 5 строк логов фронтенда:"
        tail -5 logs/frontend.log | sed 's/^/  /'
    else
        echo -e "${YELLOW}Файл логов фронтенда не найден${NC}"
    fi
    
    echo ""
}

# Проверка использования ресурсов
check_resources() {
    echo "=== ИСПОЛЬЗОВАНИЕ РЕСУРСОВ ==="
    
    # Проверка процессов Node.js
    NODE_PROCESSES=$(ps aux | grep node | grep -v grep | wc -l)
    echo "Активных процессов Node.js: $NODE_PROCESSES"
    
    # Использование памяти
    if [ -f "logs/server.pid" ] && ps -p $(cat logs/server.pid) > /dev/null 2>&1; then
        SERVER_MEM=$(ps -p $(cat logs/server.pid) -o %mem --no-headers)
        echo "Использование памяти сервером: ${SERVER_MEM}%"
    fi
    
    if [ -f "logs/frontend.pid" ] && ps -p $(cat logs/frontend.pid) > /dev/null 2>&1; then
        FRONTEND_MEM=$(ps -p $(cat logs/frontend.pid) -o %mem --no-headers)
        echo "Использование памяти фронтендом: ${FRONTEND_MEM}%"
    fi
    
    echo ""
}

# Основная функция
main() {
    echo "=========================================="
    echo "  СТАТУС ПРИЛОЖЕНИЯ REPOSTER"
    echo "=========================================="
    echo ""
    
    check_server_status
    check_frontend_status
    check_resources
    check_logs
    
    echo "=========================================="
    echo "Для запуска серверов: ./start-servers.sh"
    echo "Для остановки серверов: ./stop-servers.sh"
    echo "Для перезапуска серверов: ./restart-servers.sh"
    echo "=========================================="
}

# Запуск основной функции
main "$@" 