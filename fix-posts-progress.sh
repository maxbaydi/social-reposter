#!/bin/bash

# Скрипт для диагностики и исправления проблемы с загрузкой постов
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

# Проверка статуса серверов
check_servers() {
    log "Проверка статуса серверов..."
    
    if ! curl -s http://localhost:5000/api/auth > /dev/null 2>&1; then
        error "Backend сервер не отвечает!"
        return 1
    fi
    
    if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
        error "Frontend сервер не отвечает!"
        return 1
    fi
    
    log "Серверы работают нормально"
    return 0
}

# Диагностика базы данных
diagnose_database() {
    log "Диагностика базы данных..."
    
    echo ""
    info "=== СТАТИСТИКА БАЗЫ ДАННЫХ ==="
    
    # Проверяем количество записей в основных таблицах
    local users_count=$(sqlite3 server/database.sqlite "SELECT COUNT(*) FROM users;" 2>/dev/null || echo "0")
    local accounts_count=$(sqlite3 server/database.sqlite "SELECT COUNT(*) FROM accounts;" 2>/dev/null || echo "0")
    local tasks_count=$(sqlite3 server/database.sqlite "SELECT COUNT(*) FROM scheduled_tasks;" 2>/dev/null || echo "0")
    local cached_posts_count=$(sqlite3 server/database.sqlite "SELECT COUNT(*) FROM cached_posts;" 2>/dev/null || echo "0")
    
    echo "Пользователи: $users_count"
    echo "Аккаунты: $accounts_count"
    echo "Запланированные задачи: $tasks_count"
    echo "Кэшированные посты: $cached_posts_count"
    
    echo ""
    info "=== АККАУНТЫ WORDPRESS ==="
    sqlite3 server/database.sqlite "SELECT id, name, type, status FROM accounts WHERE type = 'wordpress';" 2>/dev/null || echo "Ошибка чтения аккаунтов"
    
    echo ""
    info "=== ЗАДАЧИ С ПРОГРЕССОМ ==="
    sqlite3 server/database.sqlite "SELECT id, name, status, sourceAccountId, progress FROM scheduled_tasks;" 2>/dev/null || echo "Ошибка чтения задач"
    
    echo ""
    info "=== КЭШИРОВАННЫЕ ПОСТЫ ПО АККАУНТАМ ==="
    sqlite3 server/database.sqlite "SELECT accountId, COUNT(*) as posts_count FROM cached_posts GROUP BY accountId;" 2>/dev/null || echo "Нет кэшированных постов"
}

# Проверка настроек фильтров
check_filters() {
    log "Проверка настроек фильтров..."
    
    echo ""
    info "=== НАСТРОЙКИ ФИЛЬТРОВ ЗАДАЧ ==="
    sqlite3 server/database.sqlite "SELECT id, name, filterSettings FROM scheduled_tasks;" 2>/dev/null || echo "Ошибка чтения фильтров"
}

# Принудительная синхронизация кэша
force_sync_cache() {
    log "Принудительная синхронизация кэша постов..."
    
    # Получаем ID WordPress аккаунтов
    local wp_accounts=$(sqlite3 server/database.sqlite "SELECT id FROM accounts WHERE type = 'wordpress';" 2>/dev/null)
    
    if [ -z "$wp_accounts" ]; then
        warning "WordPress аккаунты не найдены"
        return 1
    fi
    
    for account_id in $wp_accounts; do
        info "Синхронизация кэша для аккаунта $account_id..."
        
        # Очищаем старые записи кэша
        sqlite3 server/database.sqlite "DELETE FROM cached_posts WHERE accountId = $account_id;" 2>/dev/null
        
        # Отправляем запрос на синхронизацию через API
        local response=$(curl -s -X POST "http://localhost:5000/api/wordpress/$account_id/sync" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer test" 2>/dev/null)
        
        if [ $? -eq 0 ]; then
            log "Синхронизация запущена для аккаунта $account_id"
        else
            error "Ошибка синхронизации для аккаунта $account_id"
        fi
    done
}

# Проверка WordPress API
check_wordpress_api() {
    log "Проверка доступности WordPress API..."
    
    # Получаем данные WordPress аккаунтов
    local wp_accounts=$(sqlite3 server/database.sqlite "SELECT id, credentials FROM accounts WHERE type = 'wordpress';" 2>/dev/null)
    
    if [ -z "$wp_accounts" ]; then
        warning "WordPress аккаунты не найдены"
        return 1
    fi
    
    echo ""
    info "=== ПРОВЕРКА WORDPRESS API ==="
    
    # Здесь можно добавить проверку доступности WordPress сайтов
    # Пока просто показываем информацию об аккаунтах
    sqlite3 server/database.sqlite "SELECT id, name, status FROM accounts WHERE type = 'wordpress';" 2>/dev/null
}

# Сброс прогресса задач
reset_task_progress() {
    log "Сброс прогресса задач..."
    
    echo ""
    info "=== СБРОС ПРОГРЕССА ==="
    
    # Сбрасываем прогресс всех задач
    sqlite3 server/database.sqlite "UPDATE scheduled_tasks SET progress = '{\"current\":0,\"total\":0}';" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        log "Прогресс задач сброшен"
    else
        error "Ошибка сброса прогресса"
    fi
}

# Очистка кэша прогресса
clear_progress_cache() {
    log "Очистка кэша прогресса..."
    
    # Очищаем кэш постов
    sqlite3 server/database.sqlite "DELETE FROM cached_posts;" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        log "Кэш постов очищен"
    else
        error "Ошибка очистки кэша"
    fi
}

# Основная функция
main() {
    echo "=========================================="
    echo "  ДИАГНОСТИКА ПРОБЛЕМЫ С ПОСТАМИ"
    echo "=========================================="
    echo ""
    
    # Проверяем серверы
    if ! check_servers; then
        error "Серверы не запущены. Запустите ./start-servers.sh"
        exit 1
    fi
    
    # Диагностика
    diagnose_database
    check_filters
    check_wordpress_api
    
    echo ""
    info "=== РЕКОМЕНДАЦИИ ==="
    echo "1. Если кэшированных постов нет - запустите синхронизацию"
    echo "2. Если есть ошибки WordPress API - проверьте настройки аккаунтов"
    echo "3. Если прогресс не обновляется - сбросьте кэш"
    
    echo ""
    read -p "Хотите принудительно синхронизировать кэш? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        clear_progress_cache
        reset_task_progress
        force_sync_cache
        
        echo ""
        log "Синхронизация завершена. Проверьте прогресс через 1-2 минуты."
    fi
    
    echo ""
    log "Диагностика завершена!"
}

# Запуск основной функции
main "$@" 