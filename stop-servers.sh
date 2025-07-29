#!/bin/bash

# Скрипт для остановки всех серверов приложения
# Автор: AI Assistant

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Остановка процессов по PID файлам
stop_by_pid_files() {
    log "Остановка серверов по PID файлам..."
    
    # Остановка сервера
    if [ -f "logs/server.pid" ]; then
        SERVER_PID=$(cat logs/server.pid)
        if ps -p $SERVER_PID > /dev/null 2>&1; then
            kill -TERM $SERVER_PID
            sleep 2
            if ps -p $SERVER_PID > /dev/null 2>&1; then
                kill -KILL $SERVER_PID
                log "Сервер принудительно остановлен (PID: $SERVER_PID)"
            else
                log "Сервер остановлен (PID: $SERVER_PID)"
            fi
        else
            warning "Процесс сервера (PID: $SERVER_PID) не найден"
        fi
        rm -f logs/server.pid
    else
        warning "PID файл сервера не найден"
    fi
    
    # Остановка фронтенда
    if [ -f "logs/frontend.pid" ]; then
        FRONTEND_PID=$(cat logs/frontend.pid)
        if ps -p $FRONTEND_PID > /dev/null 2>&1; then
            kill -TERM $FRONTEND_PID
            sleep 2
            if ps -p $FRONTEND_PID > /dev/null 2>&1; then
                kill -KILL $FRONTEND_PID
                log "Фронтенд принудительно остановлен (PID: $FRONTEND_PID)"
            else
                log "Фронтенд остановлен (PID: $FRONTEND_PID)"
            fi
        else
            warning "Процесс фронтенда (PID: $FRONTEND_PID) не найден"
        fi
        rm -f logs/frontend.pid
    else
        warning "PID файл фронтенда не найден"
    fi
}

# Остановка процессов по портам
stop_by_ports() {
    log "Остановка процессов по портам..."
    
    # Остановка процессов на порту 5000 (сервер)
    if lsof -ti:5000 > /dev/null 2>&1; then
        lsof -ti:5000 | xargs kill -9
        log "Остановлены процессы на порту 5000"
    else
        log "Процессы на порту 5000 не найдены"
    fi
    
    # Остановка процессов на порту 3000 (фронтенд)
    if lsof -ti:3000 > /dev/null 2>&1; then
        lsof -ti:3000 | xargs kill -9
        log "Остановлены процессы на порту 3000"
    else
        log "Процессы на порту 3000 не найдены"
    fi
}

# Очистка временных файлов
cleanup() {
    log "Очистка временных файлов..."
    
    # Удаление PID файлов
    rm -f logs/server.pid logs/frontend.pid
    
    # Удаление nohup.out файлов если они есть
    rm -f nohup.out
    rm -f server/nohup.out
    rm -f front/nohup.out
    
    log "Временные файлы очищены"
}

# Основная функция
main() {
    log "Остановка приложения Reposter..."
    
    # Остановка по PID файлам
    stop_by_pid_files
    
    # Дополнительная остановка по портам
    stop_by_ports
    
    # Очистка
    cleanup
    
    log "Все серверы остановлены!"
}

# Запуск основной функции
main "$@" 