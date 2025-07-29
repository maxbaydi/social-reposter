#!/bin/bash

# Скрипт для перезапуска всех серверов приложения
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

# Основная функция
main() {
    log "Перезапуск приложения Reposter..."
    
    # Остановка серверов
    info "Остановка существующих серверов..."
    if [ -f "./stop-servers.sh" ]; then
        ./stop-servers.sh
    else
        error "Скрипт stop-servers.sh не найден!"
        exit 1
    fi
    
    # Небольшая пауза
    sleep 2
    
    # Запуск серверов
    info "Запуск серверов..."
    if [ -f "./start-servers.sh" ]; then
        ./start-servers.sh
    else
        error "Скрипт start-servers.sh не найден!"
        exit 1
    fi
    
    log "Перезапуск завершен!"
    
    # Показываем статус
    echo ""
    info "Текущий статус серверов:"
    if [ -f "./status-servers.sh" ]; then
        ./status-servers.sh
    fi
}

# Запуск основной функции
main "$@" 