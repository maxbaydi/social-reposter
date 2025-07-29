#!/bin/bash

# Скрипт для автоматического исправления прогресса задач
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

# Функция для обновления прогресса задачи
update_task_progress() {
    local task_id=$1
    local account_id=$2
    local filter_settings=$3
    
    info "Обновление прогресса для задачи $task_id (аккаунт $account_id)"
    
    # Получаем общее количество постов в кэше по фильтрам
    local total_posts=0
    
    # Извлекаем даты из filterSettings (упрощенная версия)
    local date_from=$(echo "$filter_settings" | grep -o '"dateFrom":"[^"]*"' | cut -d'"' -f4)
    local date_to=$(echo "$filter_settings" | grep -o '"dateTo":"[^"]*"' | cut -d'"' -f4)
    
    if [ -n "$date_from" ] && [ -n "$date_to" ]; then
        total_posts=$(sqlite3 server/database.sqlite "SELECT COUNT(*) FROM cached_posts WHERE accountId = $account_id AND publishedAt >= '$date_from' AND publishedAt <= '$date_to';" 2>/dev/null || echo "0")
    else
        total_posts=$(sqlite3 server/database.sqlite "SELECT COUNT(*) FROM cached_posts WHERE accountId = $account_id;" 2>/dev/null || echo "0")
    fi
    
    # Получаем количество уже опубликованных постов
    local published_posts=$(sqlite3 server/database.sqlite "SELECT COUNT(*) FROM logs WHERE taskId = $task_id AND level = 'success';" 2>/dev/null || echo "0")
    
    # Обновляем прогресс в базе данных
    local progress_json="{\"current\":$published_posts,\"total\":$total_posts}"
    sqlite3 server/database.sqlite "UPDATE scheduled_tasks SET progress = '$progress_json' WHERE id = $task_id;" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        log "Прогресс задачи $task_id обновлен: $published_posts / $total_posts"
    else
        error "Ошибка обновления прогресса задачи $task_id"
    fi
}

# Основная функция
main() {
    echo "=========================================="
    echo "  ИСПРАВЛЕНИЕ ПРОГРЕССА ЗАДАЧ"
    echo "=========================================="
    echo ""
    
    # Проверяем, что база данных существует
    if [ ! -f "server/database.sqlite" ]; then
        error "База данных не найдена!"
        exit 1
    fi
    
    # Получаем все активные задачи
    local tasks=$(sqlite3 server/database.sqlite "SELECT id, name, sourceAccountId, filterSettings FROM scheduled_tasks WHERE status = 'active';" 2>/dev/null)
    
    if [ -z "$tasks" ]; then
        warning "Активные задачи не найдены"
        exit 0
    fi
    
    info "Найдено активных задач: $(echo "$tasks" | wc -l)"
    
    # Обрабатываем каждую задачу
    while IFS='|' read -r task_id task_name account_id filter_settings; do
        if [ -n "$task_id" ]; then
            log "Обработка задачи: $task_name (ID: $task_id)"
            update_task_progress "$task_id" "$account_id" "$filter_settings"
        fi
    done <<< "$tasks"
    
    echo ""
    info "=== РЕЗУЛЬТАТ ==="
    sqlite3 server/database.sqlite "SELECT id, name, progress FROM scheduled_tasks WHERE status = 'active';" 2>/dev/null
    
    echo ""
    log "Исправление прогресса завершено!"
}

# Запуск основной функции
main "$@" 