import React, { useState, useMemo, useEffect } from 'react';
import { Rss, Users, ListChecks, Settings, PlusCircle, MoreHorizontal, Play, Pause, Trash2, Edit, Bot, Globe, BarChart2, Clock, CheckCircle, XCircle, AlertTriangle, FileText, Save, Eye, AtSign, Key, Bell, CreditCard, X, Calendar, ChevronDown, Wifi, WifiOff, Repeat, Shuffle, Zap, RotateCcw } from 'lucide-react';
import * as api from './api.jsx';

// STYLING: Используем Tailwind CSS для современного вида
// ICONS: Используем lucide-react для иконок

const inputStyleClasses = "w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 rounded-lg shadow-inner appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200 dark:placeholder-gray-500";

// Helper-компоненты
const IconText = ({ icon: Icon, children, className = "" }) => (
    <div className={`flex items-center space-x-2 text-gray-600 dark:text-gray-300 ${className}`}>
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span>{children}</span>
    </div>
);

const StatCard = ({ title, value, icon: Icon, change }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300">
        <div className="flex justify-between items-start">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase">{title}</h3>
            <Icon className="w-6 h-6 text-gray-400 dark:text-gray-500" />
        </div>
        <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{value}</p>
        {change && <p className={`text-xs mt-1 ${change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>{change}</p>}
    </div>
);

// Компоненты-формы для модальных окон

// Форма добавления/редактирования аккаунта
const AccountEditor = ({ setModal, onSave, account }) => {
    const [type, setType] = useState(account?.type || 'wordpress');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const isEditing = !!account;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        // Получаем форму правильно - на случай если вызывается не из onSubmit
        const form = e.target.closest('form') || e.target;
        const formData = new FormData(form);
        const credentials = {};
        
        if (type === 'wordpress') {
            credentials.url = formData.get('url');
            credentials.username = formData.get('username');
            credentials.applicationPassword = formData.get('applicationPassword');
        } else if (type === 'telegram') {
            credentials.token = formData.get('token');
            credentials.channelId = formData.get('channelId');
        } else if (type === 'vk') {
            credentials.apiKey = formData.get('apiKey');
            credentials.channelId = formData.get('channelId');
        }

        const newAccountData = {
            name: formData.get('name'),
            type: type,
            credentials,
        };
        
        try {
            await onSave(newAccountData, account?.id);
            setModal({ isOpen: false });
        } catch (err) {
            setError(err.response?.data?.message || 'Произошла ошибка при сохранении');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">{isEditing ? 'Редактировать аккаунт' : 'Добавить аккаунт'}</h2>
            
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Тип</label>
                <select value={type} onChange={(e) => setType(e.target.value)} className={inputStyleClasses} disabled={isEditing}>
                    <option value="wordpress">WordPress</option>
                    <option value="telegram">Telegram</option>
                    <option value="vk">VK</option>
                </select>
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Название (для вашего удобства)</label>
                <input name="name" type="text" defaultValue={account?.name} required className={inputStyleClasses} />
            </div>

            {type === 'wordpress' && (
                <>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL сайта</label>
                        <input name="url" type="url" placeholder="https://example.com" defaultValue={account?.credentials?.url} required className={inputStyleClasses} />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Имя пользователя WordPress</label>
                        <input name="username" type="text" placeholder="your_username" defaultValue={account?.credentials?.username} required className={inputStyleClasses} />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Application Password</label>
                        <input name="applicationPassword" type="password" placeholder="abcd 1234 5678 9012" defaultValue={account?.credentials?.applicationPassword} required className={inputStyleClasses} />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Сгенерируйте Application Password в WP Admin → Пользователи → Профиль → Application Passwords
                        </p>
                    </div>
                </>
            )}

            {type === 'telegram' && (
                 <>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Токен Telegram-бота</label>
                        <input name="token" type="text" defaultValue={account?.credentials?.token} required className={inputStyleClasses} />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ID канала (например, -100123456789 или @channelname)</label>
                        <input name="channelId" type="text" defaultValue={account?.credentials?.channelId} required className={inputStyleClasses} />
                    </div>
                 </>
            )}

            {type === 'vk' && (
                <>
                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
                        <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                            <strong>Инструкция по настройке VK:</strong>
                        </p>
                        <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-decimal list-inside">
                            <li>Перейдите в настройки сообщества → "Работа с API"</li>
                            <li>Создайте ключ доступа с правами <strong>"Управление сообществом"</strong></li>
                            <li>Убедитесь что у вас есть права администратора в сообществе</li>
                            <li>ID сообщества найдите в URL (vk.com/club123456 → ID: 123456)</li>
                            <li>Важно: используйте токен сообщества, а не личный токен!</li>
                        </ol>
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">API ключ сообщества VK</label>
                        <input name="apiKey" type="text" defaultValue={account?.credentials?.apiKey} required className={inputStyleClasses} placeholder="abc123def456..." />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ID сообщества (например, 123456 или -123456)</label>
                        <input name="channelId" type="text" defaultValue={account?.credentials?.channelId} required className={inputStyleClasses} placeholder="123456" />
                    </div>
                </>
            )}

            {error && (
                <div className="my-4 p-3 bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700 rounded-lg text-sm text-red-700 dark:text-red-200">
                    <p className="font-semibold">Не удалось сохранить аккаунт</p>
                    <p>{error}</p>
                </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setModal({ isOpen: false })} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500" disabled={isSubmitting}>Отмена</button>
                <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-colors disabled:bg-blue-400" disabled={isSubmitting}>
                    {isSubmitting ? <><Clock className="w-4 h-4 animate-spin" /><span>Проверка...</span></> : <><Save className="w-4 h-4" /><span>Сохранить</span></>}
                </button>
            </div>
        </form>
    );
};

// Форма создания/редактирования ЗАПЛАНИРОВАННОЙ задачи
const ScheduledTaskEditor = ({ setModal, onSave, task, accounts, templates }) => {
    const isEditing = !!task;
    const [intervalType, setIntervalType] = useState(task?.scheduleSettings?.type || 'fixed');
    const [foundPosts, setFoundPosts] = useState(0);
    const [sourceId, setSourceId] = useState(task?.sourceAccountId || '');
    const [terms, setTerms] = useState({ categories: [], tags: [] });
    const [isLoadingTerms, setIsLoadingTerms] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const wordpressSources = accounts.filter(a => a.type === 'wordpress' && a.status);
    const destinations = accounts.filter(a => (a.type === 'telegram' || a.type === 'vk') && a.status);

    useEffect(() => {
        if (sourceId) {
            setIsLoadingTerms(true);
            api.getWpTerms(sourceId)
                .then(response => setTerms(response.data))
                .catch(err => console.error("Failed to load WP Terms", err))
                .finally(() => setIsLoadingTerms(false));
        } else {
            setTerms({ categories: [], tags: [] });
        }
    }, [sourceId]);

    const handleDateChange = () => {
        setTimeout(() => setFoundPosts(Math.floor(Math.random() * 200) + 10), 500);
    };

    const handleSubmit = async (e, status) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        // Получаем форму правильно - на случай если вызывается не из onSubmit
        const form = e.target.closest('form') || e.target;
        const formData = new FormData(form);
        
        // Собираем выбранные категории
        const categorySelects = form.querySelectorAll('select[name="categories"] option:checked');
        const selectedCategories = Array.from(categorySelects).map(option => parseInt(option.value));
        
        // Собираем выбранные теги
        const tagSelects = form.querySelectorAll('select[name="tags"] option:checked');
        const selectedTags = Array.from(tagSelects).map(option => parseInt(option.value));
        
        // Собираем выбранные аккаунты назначения
        const destinationCheckboxes = form.querySelectorAll('input[name="destinations"]:checked');
        const selectedDestinations = Array.from(destinationCheckboxes).map(checkbox => parseInt(checkbox.value));

        // Собираем настройки интервала
        const intervalConfig = {
            type: intervalType,
            value: parseInt(formData.get('intervalValue') || '4'),
            unit: formData.get('intervalUnit') || 'hours'
        };

        if (intervalType === 'random') {
            intervalConfig.minValue = parseInt(formData.get('intervalMinValue') || '2');
            intervalConfig.maxValue = parseInt(formData.get('intervalMaxValue') || '6');
            intervalConfig.minUnit = formData.get('intervalMinUnit') || 'hours';
            intervalConfig.maxUnit = formData.get('intervalMaxUnit') || 'hours';
        }

        const newTaskData = {
            name: formData.get('name'),
            sourceAccountId: parseInt(sourceId),
            templateId: formData.get('templateId') ? parseInt(formData.get('templateId')) : null,
            status: status,
            dateFrom: formData.get('dateFrom'),
            dateTo: formData.get('dateTo'),
            categories: selectedCategories,
            tags: selectedTags,
            destinationAccounts: selectedDestinations,
            intervalConfig: intervalConfig,
            publicationOrder: formData.get('publicationOrder') || 'newest_first'
        };

        try {
            await onSave(newTaskData, task?.id);
            setModal({ isOpen: false });
        } catch (err) {
            setError(err.response?.data?.message || 'Произошла ошибка при сохранении');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const IntervalInput = ({ prefix = '' }) => (
        <div className="flex items-center gap-2">
            <input name={`interval${prefix}Value`} type="number" min="1" defaultValue={task?.scheduleSettings?.[`${prefix.toLowerCase()}Value`] || task?.scheduleSettings?.value || "4"} className={`w-24 ${inputStyleClasses}`} />
            <select name={`interval${prefix}Unit`} className={`flex-1 ${inputStyleClasses}`} defaultValue={task?.scheduleSettings?.[`${prefix.toLowerCase()}Unit`] || task?.scheduleSettings?.unit || "hours"}>
                <option value="minutes">минут</option>
                <option value="hours">часов</option>
                <option value="days">дней</option>
            </select>
        </div>
    );

    return (
        <form>
            <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">{isEditing ? 'Редактировать задачу' : 'Создать задачу'}</h2>
            
            <div className="space-y-5">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Название задачи</label>
                    <input name="name" type="text" defaultValue={task?.name} required className={inputStyleClasses} placeholder="Например, 'Статьи из блога за 2023 год'" />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Источник (WordPress сайт)</label>
                    <select required className={inputStyleClasses} value={sourceId} onChange={e => setSourceId(e.target.value)}>
                        <option value="">-- Выберите источник --</option>
                        {wordpressSources.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                    </select>
                </div>

                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-4 bg-gray-50 dark:bg-gray-800/50">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200">Настройки отложенного постинга</h3>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Фильтр постов (диапазон дат)</label>
                        <div className="flex items-center gap-2">
                            <input name="dateFrom" type="date" defaultValue={task?.filterSettings?.dateFrom} className={`w-1/2 ${inputStyleClasses}`} onChange={handleDateChange} />
                            <span>-</span>
                            <input name="dateTo" type="date" defaultValue={task?.filterSettings?.dateTo} className={`w-1/2 ${inputStyleClasses}`} onChange={handleDateChange} />
                        </div>
                        {foundPosts > 0 && <p className="text-xs text-green-600 dark:text-green-400 mt-1">Найдено постов: {foundPosts}</p>}
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Порядок публикации</label>
                        <select name="publicationOrder" className={inputStyleClasses} defaultValue={task?.publicationOrder || 'newest_first'}>
                            <option value="newest_first">Сначала новые (от последней опубликованной)</option>
                            <option value="oldest_first">Сначала старые (от самой первой в диапазоне)</option>
                            <option value="random">Случайный порядок</option>
                        </select>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Выберите, в каком порядке публиковать посты из выбранного диапазона дат
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Периодичность</label>
                        <div className="flex gap-2 mb-2">
                            <button type="button" onClick={() => setIntervalType('fixed')} className={`flex items-center gap-2 flex-1 py-2 px-4 rounded-md text-sm transition-colors ${intervalType === 'fixed' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-200' : 'bg-gray-200 dark:bg-gray-700'}`}><Repeat className="w-4 h-4" />Фиксированный</button>
                            <button type="button" onClick={() => setIntervalType('random')} className={`flex items-center gap-2 flex-1 py-2 px-4 rounded-md text-sm transition-colors ${intervalType === 'random' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-200' : 'bg-gray-200 dark:bg-gray-700'}`}><Shuffle className="w-4 h-4" />Случайный</button>
                        </div>
                        {intervalType === 'fixed' && <IntervalInput />}
                        {intervalType === 'random' && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm w-10">От:</span>
                                    <IntervalInput prefix="Min" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm w-10">До:</span>
                                    <IntervalInput prefix="Max" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                
                {isLoadingTerms && <p className="text-sm text-gray-500">Загрузка категорий и тегов...</p>}
                
                {terms.categories.length > 0 && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Категории (оставьте пустым для всех)</label>
                        <select 
                            name="categories" 
                            multiple 
                            className={`${inputStyleClasses} h-24`}
                            defaultValue={task?.filterSettings?.categories || []}
                        >
                            {terms.categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                        </select>
                    </div>
                )}

                {terms.tags.length > 0 && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Теги (оставьте пустым для всех)</label>
                        <select 
                            name="tags" 
                            multiple 
                            className={`${inputStyleClasses} h-24`}
                            defaultValue={task?.filterSettings?.tags || []}
                        >
                            {terms.tags.map(tag => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
                        </select>
                    </div>
                )}
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Шаблон поста</label>
                    <select name="templateId" className={inputStyleClasses} defaultValue={task?.templateId}>
                        <option value="">-- Шаблон по умолчанию --</option>
                        {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Куда постить</label>
                    <div className="space-y-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md max-h-40 overflow-y-auto">
                        {destinations.length > 0 ? destinations.map(acc => (
                            <label key={acc.id} className="flex items-center gap-2 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600/50">
                                <input name="destinations" type="checkbox" value={acc.id} defaultChecked={task?.destinationAccountIds?.includes(acc.id)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                <IconText icon={acc.type === 'telegram' ? Bot : Users}>{acc.name}</IconText>
                            </label>
                        )) : <p className="text-sm text-gray-500">Нет доступных аккаунтов для постинга.</p>}
                    </div>
                </div>
            </div>

            {error && (
                <div className="my-4 p-3 bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700 rounded-lg text-sm text-red-700 dark:text-red-200">
                    <p className="font-semibold">Не удалось сохранить задачу</p>
                    <p>{error}</p>
                </div>
            )}

            <div className="flex justify-end gap-3 mt-8">
                <button type="button" onClick={(e) => handleSubmit(e, 'draft')} disabled={isSubmitting} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50">
                    {isSubmitting ? 'Сохранение...' : 'Сохранить как черновик'}
                </button>
                <button type="button" onClick={(e) => handleSubmit(e, 'active')} disabled={isSubmitting} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-colors disabled:bg-blue-400">
                    {isSubmitting ? <Clock className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    <span>{isSubmitting ? 'Сохранение...' : (isEditing ? 'Сохранить и запустить' : 'Запустить задачу')}</span>
                </button>
            </div>
        </form>
    );
};

// Форма создания LIVE репоста
const LiveTaskEditor = ({ setModal, onSave, task, accounts, templates }) => {
    const isEditing = !!task;
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const wordpressSources = accounts.filter(a => a.type === 'wordpress' && a.status);
    const destinations = accounts.filter(a => (a.type === 'telegram' || a.type === 'vk') && a.status);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        // Получаем форму правильно - на случай если вызывается не из onSubmit
        const form = e.target.closest('form') || e.target;
        const formData = new FormData(form);
        
        // Собираем выбранные аккаунты назначения
        const destinationCheckboxes = form.querySelectorAll('input[name="destinations"]:checked');
        const selectedDestinations = Array.from(destinationCheckboxes).map(checkbox => parseInt(checkbox.value));

        const sourceAccountId = parseInt(formData.get('source'));
        const sourceName = form.source.options[form.source.selectedIndex].text;

        const newTaskData = {
            name: isEditing ? task.name : `Live: ${sourceName}`,
            sourceAccountId: sourceAccountId,
            templateId: formData.get('templateId') ? parseInt(formData.get('templateId')) : null,
            destinationAccounts: selectedDestinations,
            status: 'active'
        };

        try {
            await onSave(newTaskData, task?.id);
            setModal({ isOpen: false });
        } catch (err) {
            setError(err.response?.data?.message || 'Произошла ошибка при сохранении');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">{isEditing ? 'Редактировать Live репост' : 'Создать Live репост'}</h2>
            <div className="space-y-5">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Отслеживать сайт</label>
                    <select name="source" required className={inputStyleClasses} defaultValue={task?.sourceAccountId}>
                        <option value="">-- Выберите сайт для отслеживания --</option>
                        {wordpressSources.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                    </select>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Шаблон поста</label>
                    <select name="templateId" className={inputStyleClasses} defaultValue={task?.templateId}>
                        <option value="">-- Шаблон по умолчанию --</option>
                        {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Публиковать в</label>
                    <div className="space-y-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md max-h-40 overflow-y-auto">
                        {destinations.length > 0 ? destinations.map(acc => (
                            <label key={acc.id} className="flex items-center gap-2 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600/50">
                                <input type="checkbox" name="destinations" value={acc.id} defaultChecked={task?.destinationAccountIds?.includes(acc.id)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                <IconText icon={acc.type === 'telegram' ? Bot : Users}>{acc.name}</IconText>
                            </label>
                        )) : <p className="text-sm text-gray-500">Нет доступных аккаунтов для постинга.</p>}
                    </div>
                </div>
            </div>

            {error && (
                <div className="my-4 p-3 bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700 rounded-lg text-sm text-red-700 dark:text-red-200">
                    <p className="font-semibold">Не удалось сохранить Live задачу</p>
                    <p>{error}</p>
                </div>
            )}

             <div className="flex justify-end gap-3 mt-8">
                <button type="button" onClick={() => setModal({ isOpen: false })} disabled={isSubmitting} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50">Отмена</button>
                <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-colors disabled:bg-blue-400">
                    {isSubmitting ? <Clock className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    <span>{isSubmitting ? 'Сохранение...' : (isEditing ? 'Сохранить' : 'Активировать')}</span>
                </button>
            </div>
        </form>
    );
}

// Модальное окно подтверждения
const ConfirmationModal = ({ setModal, onConfirm, title, message }) => {
    return (
        <div>
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">{title}</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
            <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setModal({ isOpen: false })} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500">Отмена</button>
                <button onClick={onConfirm} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 transition-colors">
                    <Trash2 className="w-4 h-4" />
                    <span>Удалить</span>
                </button>
            </div>
        </div>
    );
};


// Основные компоненты страниц

const Dashboard = ({ setModal }) => {
    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState({
        sitesCount: 0,
        activeTasksCount: 0,
        todayReposts: 0,
        errorsCount: 0,
        weeklyData: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadDashboardData = async () => {
            try {
                const [logsResponse, statsResponse] = await Promise.all([
                    api.getLogs(),
                    api.getStats()
                ]);
                setLogs(logsResponse.data);
                setStats(statsResponse.data);
            } catch (err) {
                console.error('Failed to load dashboard data:', err);
            } finally {
                setLoading(false);
            }
        };

        loadDashboardData();
    }, []);

    const getIconForLog = (level) => {
        if (level === 'success') return <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />;
        if (level === 'error') return <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />;
        return <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />;
    };

    const chartData = stats.weeklyData.length > 0 ? stats.weeklyData : [
        { label: 'Неделя 1', value: 0 },
        { label: 'Неделя 2', value: 0 },
        { label: 'Неделя 3', value: 0 },
        { label: 'Эта неделя', value: 0 }
    ];
    const maxValue = Math.max(...chartData.map(d => d.value), 1);

    const systemStatus = [
        { name: 'WordPress API', status: true },
        { name: 'Telegram Bot API', status: true },
        { name: 'VK API', status: stats.vkApiStatus !== false }
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <Clock className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
                    <p className="text-gray-500 dark:text-gray-400">Загрузка данных...</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Главная панель</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard 
                    title="Подключено сайтов" 
                    value={stats.sitesCount} 
                    icon={Globe} 
                    change={stats.sitesChangeWeek ? `${stats.sitesChangeWeek > 0 ? '+' : ''}${stats.sitesChangeWeek} за неделю` : null} 
                />
                <StatCard 
                    title="Активных задач" 
                    value={stats.activeTasksCount} 
                    icon={ListChecks} 
                    change={stats.tasksChangeWeek ? `${stats.tasksChangeWeek > 0 ? '+' : ''}${stats.tasksChangeWeek} за неделю` : null} 
                />
                <StatCard 
                    title="Репостов сегодня" 
                    value={stats.todayReposts} 
                    icon={BarChart2} 
                    change={stats.repostsChange ? `${stats.repostsChange > 0 ? '+' : ''}${stats.repostsChange}` : null} 
                />
                <StatCard 
                    title="Ошибок" 
                    value={stats.errorsCount} 
                    icon={AlertTriangle} 
                    change={stats.errorsCount > 0 ? "Требует внимания" : "Всё в порядке"} 
                />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Активность репостов</h2>
                    <div className="flex justify-around items-end h-64 border-l border-b border-gray-200 dark:border-gray-700 p-4">
                        {chartData.map(item => (
                            <div key={item.label} className="flex flex-col items-center w-1/5">
                                <div 
                                    className="w-full bg-blue-500 rounded-t-md hover:bg-blue-600 transition-colors" 
                                    style={{ height: `${Math.max((item.value / maxValue) * 100, 2)}%` }} 
                                    title={`${item.label}: ${item.value} постов`}
                                ></div>
                                <span className="text-xs text-gray-500 dark:text-gray-400 mt-2">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                     <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Статус системы</h2>
                     <ul className="space-y-4">
                        {systemStatus.map(service => (
                            <li key={service.name} className="flex items-center justify-between">
                                <span className="text-gray-700 dark:text-gray-300">{service.name}</span>
                                {service.status ? 
                                    <IconText icon={Wifi} className="text-green-500">Online</IconText> : 
                                    <IconText icon={WifiOff} className="text-red-500">Offline</IconText>
                                }
                            </li>
                        ))}
                     </ul>
                </div>
            </div>
            <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Последние действия</h2>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md">
                    <ul className="space-y-3">
                        {logs.length === 0 ? (
                            <p className="text-gray-500 dark:text-gray-400">Нет недавних действий.</p>
                        ) : (
                            logs.slice(0, 5).map(log => (
                                <li key={log.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                                    {getIconForLog(log.level)}
                                    <p className="text-sm text-gray-700 dark:text-gray-300 flex-1">{log.message}</p>
                                    <span className="text-xs text-gray-400 flex-shrink-0">
                                        {new Date(log.createdAt).toLocaleString()}
                                    </span>
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            </div>
        </div>
    );
};

const Accounts = ({ setModal, accounts, handleSaveAccount, handleDeleteAccount, handleToggleAccountStatus }) => {
    const openEditor = (acc = null) => {
        setModal({ isOpen: true, content: <AccountEditor setModal={setModal} onSave={handleSaveAccount} account={acc} /> });
    };
    const openDeleteConfirm = (account) => {
        setModal({ isOpen: true, content: <ConfirmationModal setModal={setModal} onConfirm={() => { handleDeleteAccount(account.id); setModal({ isOpen: false }); }} title="Удалить аккаунт?" message={`Вы уверены, что хотите удалить аккаунт "${account.name}"? Это действие необратимо.`}/> });
    };
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Подключенные аккаунты</h1>
                <button onClick={() => openEditor()} className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-colors"><PlusCircle className="w-5 h-5" /><span>Добавить</span></button>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {accounts.map(acc => (
                        <li key={acc.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <div className="flex items-center gap-4">
                                {acc.type === 'wordpress' && <Globe className="w-6 h-6 text-blue-500" />}
                                {acc.type === 'telegram' && <Bot className="w-6 h-6 text-sky-500" />}
                                {acc.type === 'vk' && <Users className="w-6 h-6 text-indigo-500" />}
                                <div><p className="font-semibold text-gray-900 dark:text-white">{acc.name}</p><p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{acc.type}</p></div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${acc.status ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>{acc.status ? 'Активен' : 'Неактивен'}</span>
                                <label className="inline-flex items-center cursor-pointer"><input type="checkbox" checked={acc.status} onChange={() => handleToggleAccountStatus(acc.id)} className="sr-only peer" /><div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div></label>
                                <button onClick={() => openEditor(acc)} className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"><Edit className="w-4 h-4" /></button>
                                <button onClick={() => openDeleteConfirm(acc)} className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

const ScheduledTasks = ({ setModal, tasks, accounts, templates, handleSaveTask, handleDeleteTask, handleToggleTaskStatus, handleClearHistory }) => {
    const getStatusChip = (status) => {
        switch (status) {
            case 'active': return <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Активна</span>;
            case 'paused': return <span className="text-xs font-medium px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">На паузе</span>;
            case 'error': return <span className="text-xs font-medium px-2 py-1 rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Ошибка</span>;
            case 'completed': return <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Завершена</span>;
            case 'draft': return <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">Черновик</span>;
            default: return <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">{status}</span>;
        }
    };
    const openEditor = (task = null) => {
        setModal({ isOpen: true, content: <ScheduledTaskEditor setModal={setModal} onSave={handleSaveTask} task={task} accounts={accounts} templates={templates} /> });
    };
    const openDeleteConfirm = (task) => {
        setModal({ isOpen: true, content: <ConfirmationModal setModal={setModal} onConfirm={() => { handleDeleteTask(task.id); setModal({ isOpen: false }); }} title="Удалить задачу?" message={`Вы уверены, что хотите удалить задачу "${task.name}"?`}/> });
    };
    
    const showTaskHistory = (task) => {
        setModal({ isOpen: true, content: <TaskHistoryModal task={task} /> });
    };

    const openClearHistoryConfirm = (task) => {
        setModal({ 
            isOpen: true, 
            content: <ConfirmationModal 
                setModal={setModal} 
                onConfirm={() => { 
                    handleClearHistory(task.id); 
                    setModal({ isOpen: false }); 
                }} 
                title="Очистить историю публикаций?" 
                message={`Вы уверены, что хотите очистить историю публикаций для задачи "${task.name}"? Это позволит переопубликовать все посты заново.`}
            /> 
        });
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Запланированные задачи</h1>
                <button onClick={() => openEditor()} className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-colors"><PlusCircle className="w-5 h-5" /><span>Создать задачу</span></button>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr><th scope="col" className="px-6 py-3">Название задачи</th><th scope="col" className="px-6 py-3">Статус</th><th scope="col" className="px-6 py-3">Прогресс</th><th scope="col" className="px-6 py-3">Следующий пост</th><th scope="col" className="px-6 py-3 text-right">Действия</th></tr>
                        </thead>
                        <tbody>
                            {tasks.map(task => (
                                <tr key={task.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{task.name}</th>
                                    <td className="px-6 py-4">{getStatusChip(task.status)}</td>
                                    <td className="px-6 py-4"><div className="flex items-center gap-2"><span>{`${task.progress.current} / ${task.progress.total}`}</span><div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700"><div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${(task.progress.current / task.progress.total) * 100}%` }}></div></div></div></td>
                                    <td className="px-6 py-4"><IconText icon={Clock}>{task.nextRun}</IconText></td>
                                    <td className="px-6 py-4 text-right"><div className="flex items-center justify-end gap-2">
                                        <button onClick={() => showTaskHistory(task)} className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300" title="Показать историю"><Eye className="w-4 h-4" /></button>
                                        <button onClick={() => openClearHistoryConfirm(task)} className="p-2 text-gray-500 hover:text-orange-600 dark:hover:text-orange-400" title="Очистить историю публикаций"><RotateCcw className="w-4 h-4" /></button>
                                        {task.status === 'active' && <button onClick={() => handleToggleTaskStatus(task.id)} className="p-2 text-gray-500 hover:text-yellow-600 dark:hover:text-yellow-400" title="Приостановить"><Pause className="w-4 h-4" /></button>}
                                        {(task.status === 'paused' || task.status === 'draft') && <button onClick={() => handleToggleTaskStatus(task.id)} className="p-2 text-gray-500 hover:text-green-600 dark:hover:text-green-400" title="Запустить"><Play className="w-4 h-4" /></button>}
                                        <button onClick={() => openEditor(task)} className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400" title="Редактировать"><Edit className="w-4 h-4" /></button>
                                        <button onClick={() => openDeleteConfirm(task)} className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400" title="Удалить"><Trash2 className="w-4 h-4" /></button>
                                    </div></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const LiveReposts = ({ setModal, tasks, accounts, templates, handleSaveTask, handleDeleteTask, handleToggleTaskStatus }) => {
    const openEditor = (task = null) => {
        setModal({ isOpen: true, content: <LiveTaskEditor setModal={setModal} onSave={handleSaveTask} task={task} accounts={accounts} templates={templates} /> });
    };
    const openDeleteConfirm = (task) => {
        setModal({ isOpen: true, content: <ConfirmationModal setModal={setModal} onConfirm={() => { handleDeleteTask(task.id); setModal({ isOpen: false }); }} title="Остановить Live репост?" message={`Вы уверены, что хотите остановить отслеживание сайта для задачи "${task.name}"?`}/> });
    };
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Репост в реальном времени (Live)</h1>
                <button onClick={() => openEditor()} className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-colors"><PlusCircle className="w-5 h-5" /><span>Настроить Live репост</span></button>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {tasks.map(task => (
                        <li key={task.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <div className="flex items-center gap-4">
                               <Zap className={`w-6 h-6 ${task.status === 'active' ? 'text-green-500' : 'text-yellow-500'}`} />
                                <div>
                                    <p className="font-semibold text-gray-900 dark:text-white">{task.name}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Постит в {task.destinations} соцсети</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${task.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'}`}>{task.status === 'active' ? 'Активен' : 'На паузе'}</span>
                                <div className="flex items-center justify-end gap-2">
                                    {task.status === 'active' && <button onClick={() => handleToggleTaskStatus(task.id)} className="p-2 text-gray-500 hover:text-yellow-600 dark:hover:text-yellow-400"><Pause className="w-4 h-4" /></button>}
                                    {task.status === 'paused' && <button onClick={() => handleToggleTaskStatus(task.id)} className="p-2 text-gray-500 hover:text-green-600 dark:hover:text-green-400"><Play className="w-4 h-4" /></button>}
                                    <button onClick={() => openDeleteConfirm(task)} className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

const Templates = ({ setModal, templates, accounts, handleSaveTemplate, handleDeleteTemplate }) => {
    const openDeleteConfirm = (template) => {
        setModal({ isOpen: true, content: <ConfirmationModal setModal={setModal} onConfirm={() => { handleDeleteTemplate(template.id); setModal({ isOpen: false }); }} title="Удалить шаблон?" message={`Вы уверены, что хотите удалить шаблон "${template.name}"?`}/> });
    };
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Шаблоны постов</h1>
                <button onClick={() => setModal({ isOpen: true, content: <TemplateEditor setModal={setModal} accounts={accounts} onSave={handleSaveTemplate} /> })} className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-colors"><PlusCircle className="w-5 h-5" /><span>Создать шаблон</span></button>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {templates.map(template => (
                        <li key={template.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <div className="flex items-center gap-4">
                               <FileText className="w-6 h-6 text-gray-400" />
                                <div><p className="font-semibold text-gray-900 dark:text-white">{template.name}</p><div className="flex gap-2 mt-1">{template.platforms.includes('telegram') && <IconText icon={Bot} className="text-xs text-sky-500">Telegram</IconText>}{template.platforms.includes('vk') && <IconText icon={Users} className="text-xs text-indigo-500">VK</IconText>}</div></div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setModal({ isOpen: true, content: <TemplateEditor setModal={setModal} template={template} accounts={accounts} onSave={handleSaveTemplate} /> })} className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"><Edit className="w-4 h-4" /></button>
                                <button onClick={() => openDeleteConfirm(template)} className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

const TemplateEditor = ({ setModal, template, accounts, onSave }) => {
    const [preview, setPreview] = useState({ content: '', image: null, postTitle: '' });
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [debounceTimer, setDebounceTimer] = useState(null);
    const isEditing = !!template;
    
    const wordpressSources = accounts.filter(a => a.type === 'wordpress' && a.status);
    const shortcodes = ['{post_title}', '{post_url}', '{post_excerpt}', '{post_image}', '{post_tags}'];

    const handleGeneratePreview = () => {
        if (!selectedAccountId) return;
        
        // Получаем текущее содержимое из формы
        const form = document.querySelector('form');
        const formData = new FormData(form);
        const templateContent = formData.get('content');
        
        if (!templateContent) return;
        
        // Получаем выбранные платформы для корректного предпросмотра
        const platformCheckboxes = form.querySelectorAll('input[name="platforms"]:checked');
        const selectedPlatforms = Array.from(platformCheckboxes).map(checkbox => checkbox.value);
        const platform = selectedPlatforms.includes('vk') ? 'vk' : 'telegram'; // Приоритет VK для предпросмотра
        
        setIsLoadingPreview(true);
        
        // ИСПРАВЛЕНО: всегда используем текущее содержимое из формы для предпросмотра
        // Это обеспечивает обновление предпросмотра в реальном времени при изменениях
        api.getTemplatePreviewByContent(selectedAccountId, templateContent, platform)
            .then(res => setPreview(res.data))
            .catch(err => console.error(err))
            .finally(() => setIsLoadingPreview(false));
    };

    // Автоматическое обновление предпросмотра с debouncing
    const handleContentChange = () => {
        if (!selectedAccountId) return;
        
        // Очищаем предыдущий таймер
        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }
        
        // Устанавливаем новый таймер на 1 секунду
        const newTimer = setTimeout(() => {
            handleGeneratePreview();
        }, 1000);
        
        setDebounceTimer(newTimer);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        // Получаем форму правильно - на случай если вызывается не из onSubmit
        const form = e.target.closest('form') || e.target;
        const formData = new FormData(form);
        
        // Собираем выбранные платформы
        const platformCheckboxes = form.querySelectorAll('input[name="platforms"]:checked');
        const selectedPlatforms = Array.from(platformCheckboxes).map(checkbox => checkbox.value);

        const templateData = {
            name: formData.get('name'),
            content: formData.get('content'),
            utmTags: formData.get('utmTags'),
            platforms: selectedPlatforms
        };

        try {
            await onSave(templateData, template?.id);
            setModal({ isOpen: false });
        } catch (err) {
            setError(err.response?.data?.message || 'Произошла ошибка при сохранении');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Функция для декодирования HTML entities
    const decodeHtmlEntities = (text) => {
        if (!text) return text;
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        return textarea.value;
    };

    // Cleanup таймера при размонтировании компонента
    useEffect(() => {
        return () => {
            if (debounceTimer) {
                clearTimeout(debounceTimer);
            }
        };
    }, [debounceTimer]);

    return (
        <form onSubmit={handleSubmit}>
            <div className="p-2">
                <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">{isEditing ? 'Редактировать шаблон' : 'Создать шаблон'}</h2>
                <div className="mb-4">
                    <label htmlFor="template-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Название шаблона</label>
                    <input name="name" type="text" id="template-name" defaultValue={template?.name || "Новый шаблон"} required className={inputStyleClasses} />
                </div>
                
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Платформы</label>
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2">
                            <input name="platforms" type="checkbox" value="telegram" defaultChecked={template?.platforms?.includes('telegram')} onChange={handleContentChange} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                            <span>Telegram</span>
                        </label>
                        <label className="flex items-center gap-2">
                            <input name="platforms" type="checkbox" value="vk" defaultChecked={template?.platforms?.includes('vk')} onChange={handleContentChange} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                            <span>VK</span>
                        </label>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="template-body" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Содержимое шаблона</label>
                        <textarea name="content" id="template-body" rows="10" onChange={handleContentChange} className={`${inputStyleClasses} font-mono text-sm`} defaultValue={template?.content || "{post_title}\n\n{post_excerpt}\n\nПодробнее: {post_url}\n\n#{post_tags}"}></textarea>
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">UTM-метки</label>
                            <input name="utmTags" type="text" placeholder="utm_source=socialreposter&utm_medium=telegram" defaultValue={template?.utmTags} className={`${inputStyleClasses} text-sm`} />
                        </div>
                        <div className="mt-2">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Доступные переменные:</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                                {shortcodes.map(code => 
                                    <span key={code} className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-2 py-1 rounded-md cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-500">{code}</span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Предпросмотр (Telegram)</label>
                        
                        <div className="flex items-center gap-2 mb-2">
                            <select className={inputStyleClasses} value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)}>
                                <option value="">-- Выберите сайт для предпросмотра --</option>
                                {wordpressSources.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                            </select>
                            <button type="button" onClick={handleGeneratePreview} className="px-3 py-2 bg-blue-100 text-blue-700 rounded-md disabled:opacity-50" disabled={!selectedAccountId || isLoadingPreview}>
                                {isLoadingPreview ? '...' : 'Предпросмотр'}
                            </button>
                        </div>

                        <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/50">
                            {isLoadingPreview ? <p>Загрузка...</p> : (
                                <>
                                    <p className="font-bold text-gray-900 dark:text-white">{decodeHtmlEntities(preview.postTitle) || 'Заголовок поста'}</p>
                                    {preview.image && <div className="my-2 h-24 bg-gray-300 dark:bg-gray-600 rounded-md flex items-center justify-center"><img src={preview.image} alt="Preview" className="max-h-full max-w-full" /></div>}
                                    <div 
                                        className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap" 
                                        dangerouslySetInnerHTML={{ __html: preview.content || 'Содержимое поста...' }}
                                    />
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="my-4 p-3 bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700 rounded-lg text-sm text-red-700 dark:text-red-200">
                        <p className="font-semibold">Не удалось сохранить шаблон</p>
                        <p>{error}</p>
                    </div>
                )}

                <div className="flex justify-end gap-3 mt-6">
                    <button type="button" onClick={() => setModal({ isOpen: false })} disabled={isSubmitting} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50">Отмена</button>
                    <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-colors disabled:bg-blue-400">
                        {isSubmitting ? <Clock className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        <span>{isSubmitting ? 'Сохранение...' : 'Сохранить'}</span>
                    </button>
                </div>
            </div>
        </form>
    );
};

const AppSettings = () => {
    const [activeTab, setActiveTab] = useState('profile');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const [userProfile, setUserProfile] = useState({
        name: '',
        email: ''
    });
    const [userSettings, setUserSettings] = useState({
        emailOnError: true,
        emailOnTaskComplete: true,
        weeklyReport: false
    });

    const tabs = [
        { id: 'profile', label: 'Профиль', icon: AtSign },
        { id: 'password', label: 'Безопасность', icon: Key },
        { id: 'notifications', label: 'Уведомления', icon: Bell },
    ];

    useEffect(() => {
        const loadSettings = async () => {
            try {
                const [profileResponse, settingsResponse] = await Promise.all([
                    api.getMe(),
                    api.getUserSettings()
                ]);
                setUserProfile(profileResponse.data);
                setUserSettings(settingsResponse.data);
            } catch (err) {
                console.error('Failed to load settings:', err);
                setMessage({ type: 'error', text: 'Не удалось загрузить настройки' });
            } finally {
                setLoading(false);
            }
        };

        loadSettings();
    }, []);

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        // Получаем форму правильно - на случай если вызывается не из onSubmit
        const form = e.target.closest('form') || e.target;
        const formData = new FormData(form);
        const profileData = {
            name: formData.get('name'),
            email: formData.get('email')
        };

        try {
            const response = await api.updateUserProfile(profileData);
            setUserProfile(response.data);
            setMessage({ type: 'success', text: 'Профиль успешно обновлен' });
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Ошибка при обновлении профиля' });
        } finally {
            setSaving(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        // Получаем форму правильно - на случай если вызывается не из onSubmit
        const form = e.target.closest('form') || e.target;
        const formData = new FormData(form);
        const passwordData = {
            currentPassword: formData.get('currentPassword'),
            newPassword: formData.get('newPassword'),
            confirmPassword: formData.get('confirmPassword')
        };

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setMessage({ type: 'error', text: 'Новые пароли не совпадают' });
            setSaving(false);
            return;
        }

        try {
            await api.updateUserPassword(passwordData);
            setMessage({ type: 'success', text: 'Пароль успешно изменен' });
            e.target.reset();
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Ошибка при изменении пароля' });
        } finally {
            setSaving(false);
        }
    };

    const handleNotificationChange = async (setting, value) => {
        try {
            const newSettings = { ...userSettings, [setting]: value };
            await api.updateUserSettings(newSettings);
            setUserSettings(newSettings);
        } catch (err) {
            console.error('Failed to update notification settings:', err);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <Clock className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
                    <p className="text-gray-500 dark:text-gray-400">Загрузка настроек...</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Настройки</h1>
            
            {message && (
                <div className={`mb-6 p-4 rounded-lg border ${
                    message.type === 'success' 
                        ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/50 dark:border-green-700 dark:text-green-200'
                        : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/50 dark:border-red-700 dark:text-red-200'
                }`}>
                    {message.text}
                </div>
            )}

            <div className="flex flex-col md:flex-row gap-8">
                <aside className="md:w-1/4">
                    <ul className="space-y-1">
                        {tabs.map(tab => (
                            <li key={tab.id}>
                                <button 
                                    onClick={() => setActiveTab(tab.id)} 
                                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        activeTab === tab.id 
                                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/50 dark:text-white' 
                                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white'
                                    }`}
                                >
                                    <tab.icon className="w-5 h-5" />
                                    {tab.label}
                                </button>
                            </li>
                        ))}
                    </ul>
                </aside>
                
                <main className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 md:p-8">
                    {activeTab === 'profile' && (
                        <form onSubmit={handleProfileSubmit}>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Профиль</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Имя</label>
                                    <input 
                                        name="name" 
                                        type="text" 
                                        defaultValue={userProfile.name} 
                                        className={`md:w-1/2 ${inputStyleClasses}`} 
                                        required 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                                    <input 
                                        name="email" 
                                        type="email" 
                                        defaultValue={userProfile.email} 
                                        className={`md:w-1/2 ${inputStyleClasses}`} 
                                        required 
                                    />
                                </div>
                                <button 
                                    type="submit" 
                                    disabled={saving} 
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 disabled:bg-blue-400"
                                >
                                    {saving ? <Clock className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    {saving ? 'Сохранение...' : 'Сохранить'}
                                </button>
                            </div>
                        </form>
                    )}
                    
                    {activeTab === 'password' && (
                        <form onSubmit={handlePasswordSubmit}>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Изменить пароль</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Текущий пароль</label>
                                    <input 
                                        name="currentPassword" 
                                        type="password" 
                                        className={`md:w-1/2 ${inputStyleClasses}`} 
                                        required 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Новый пароль</label>
                                    <input 
                                        name="newPassword" 
                                        type="password" 
                                        className={`md:w-1/2 ${inputStyleClasses}`} 
                                        required 
                                        minLength="6"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Повторите новый пароль</label>
                                    <input 
                                        name="confirmPassword" 
                                        type="password" 
                                        className={`md:w-1/2 ${inputStyleClasses}`} 
                                        required 
                                        minLength="6"
                                    />
                                </div>
                                <button 
                                    type="submit" 
                                    disabled={saving} 
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 disabled:bg-blue-400"
                                >
                                    {saving ? <Clock className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                                    {saving ? 'Обновление...' : 'Обновить пароль'}
                                </button>
                            </div>
                        </form>
                    )}
                    
                    {activeTab === 'notifications' && (
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Настройки уведомлений</h2>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                                    <p className="font-medium">Присылать email при ошибке публикации</p>
                                    <input 
                                        type="checkbox" 
                                        checked={userSettings.emailOnError} 
                                        onChange={(e) => handleNotificationChange('emailOnError', e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                                    />
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                                    <p className="font-medium">Присылать email по завершении задачи</p>
                                    <input 
                                        type="checkbox" 
                                        checked={userSettings.emailOnTaskComplete} 
                                        onChange={(e) => handleNotificationChange('emailOnTaskComplete', e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                                    />
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                                    <p className="font-medium">Присылать еженедельный отчет</p>
                                    <input 
                                        type="checkbox" 
                                        checked={userSettings.weeklyReport} 
                                        onChange={(e) => handleNotificationChange('weeklyReport', e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

const Modal = ({ modal, setModal }) => {
    if (!modal.isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={() => setModal({ isOpen: false })}>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b dark:border-gray-700 flex justify-end"><button onClick={() => setModal({ isOpen: false })} className="text-gray-400 hover:text-gray-600 dark:hover:text-white"><X className="w-6 h-6" /></button></div>
                <div className="p-4 md:p-6 overflow-y-auto">{modal.content}</div>
            </div>
        </div>
    );
};

const initialAccounts = [ ];
const initialScheduledTasks = [ ];
const initialLiveTasks = [ ];
const initialTemplates = [ ];

export default function App() {
    const [activePage, setActivePage] = useState('dashboard');
    const [modal, setModal] = useState({ isOpen: false, content: null });
    const [accounts, setAccounts] = useState(initialAccounts);
    const [scheduledTasks, setScheduledTasks] = useState(initialScheduledTasks);
    const [liveTasks, setLiveTasks] = useState(initialLiveTasks);
    const [templates, setTemplates] = useState(initialTemplates);
    const [user, setUser] = useState(null); // Добавляем состояние для пользователя

    useEffect(() => {
        // Проверяем наличие токена и получаем данные пользователя
        const token = localStorage.getItem('token');
        if (token) {
            api.getMe().then(response => {
                setUser(response.data);
                // Загружаем все данные после успешной аутентификации
                loadAllData();
            }).catch(() => {
                // Если токен невалидный, чистим его
                localStorage.removeItem('token');
                setUser(null);
            });
        }
    }, []);

    // Автоматическое обновление данных каждые 30 секунд
    useEffect(() => {
        if (!user) return;
        
        const interval = setInterval(() => {
            loadAllData();
        }, 30000); // 30 секунд

        return () => clearInterval(interval);
    }, [user]);

    const loadAllData = async () => {
        try {
            const [accountsData, scheduledTasksData, liveTasksData, templatesData] = await Promise.all([
                api.getAccounts(),
                api.getScheduledTasks(),
                api.getLiveTasks(),
                api.getTemplates(),
            ]);
            setAccounts(accountsData.data);
            setScheduledTasks(scheduledTasksData.data);
            setLiveTasks(liveTasksData.data);
            setTemplates(templatesData.data);
        } catch (error) {
            console.error("Failed to load data", error);
            // Тут можно показать уведомление об ошибке
        }
    };
    
    // Функции-обертки для работы с API
    const handleSaveAccount = async (accountData, accountId) => {
        if (accountId) {
            // Обновление существующего аккаунта
            const response = await api.updateAccount(accountId, accountData);
            setAccounts(prev => prev.map(a => a.id === accountId ? response.data : a));
        } else {
            // Создание нового аккаунта
            const response = await api.createAccount(accountData);
            setAccounts(prev => [...prev, response.data]);
        }
    };
    const handleDeleteAccount = async (accountId) => {
        try {
            await api.deleteAccount(accountId);
            setAccounts(prev => prev.filter(a => a.id !== accountId));
        } catch (error) {
            console.error("Failed to delete account", error);
        }
    };
    const handleToggleAccountStatus = async (accountId) => {
        try {
            const response = await api.toggleAccountStatus(accountId);
            setAccounts(prev => prev.map(a => a.id === accountId ? response.data : a));
        } catch (error) {
            console.error("Failed to toggle account status", error);
        }
    };
    
    const handleSaveScheduledTask = async (taskData, taskId) => {
        if (taskId) {
            // Обновление существующей задачи
            const response = await api.updateScheduledTask(taskId, taskData);
            setScheduledTasks(prev => prev.map(t => t.id === taskId ? response.data : t));
        } else {
            // Создание новой задачи
            const response = await api.createScheduledTask(taskData);
            setScheduledTasks(prev => [...prev, response.data]);
        }
    };
    const handleDeleteScheduledTask = async (taskId) => { 
        try {
            await api.deleteScheduledTask(taskId);
            setScheduledTasks(prev => prev.filter(t => t.id !== taskId));
        } catch (error) {
            console.error("Failed to delete scheduled task", error);
        }
    };
        const handleToggleScheduledTaskStatus = async (taskId) => {
        try {
            const response = await api.toggleScheduledTaskStatus(taskId);
            setScheduledTasks(prev => prev.map(t => t.id === taskId ? response.data : t));
        } catch (error) {
            console.error("Failed to toggle scheduled task status", error);
        }
    };

    const handleClearScheduledTaskHistory = async (taskId) => {
        try {
            await api.clearScheduledTaskHistory(taskId);
            // Обновляем данные задач после очистки истории
            loadAllData();
        } catch (error) {
            console.error("Failed to clear task history", error);
        }
    };
    
    const handleSaveLiveTask = async (taskData, taskId) => {
        if (taskId) {
            // Обновление существующей Live-задачи
            const response = await api.updateLiveTask(taskId, taskData);
            setLiveTasks(prev => prev.map(t => t.id === taskId ? response.data : t));
        } else {
            // Создание новой Live-задачи
            const response = await api.createLiveTask(taskData);
            setLiveTasks(prev => [...prev, response.data]);
        }
    };
    const handleDeleteLiveTask = async (taskId) => {
        try {
            await api.deleteLiveTask(taskId);
            setLiveTasks(prev => prev.filter(t => t.id !== taskId));
        } catch (error) {
            console.error("Failed to delete live task", error);
        }
    };
    const handleToggleLiveTaskStatus = async (taskId) => {
        try {
            const response = await api.toggleLiveTaskStatus(taskId);
            setLiveTasks(prev => prev.map(t => t.id === taskId ? response.data : t));
        } catch (error) {
            console.error("Failed to toggle live task status", error);
        }
    };

    const handleSaveTemplate = async (templateData, templateId) => {
        if (templateId) {
            // Обновление существующего шаблона
            const response = await api.updateTemplate(templateId, templateData);
            setTemplates(prev => prev.map(t => t.id === templateId ? response.data : t));
        } else {
            // Создание нового шаблона
            const response = await api.createTemplate(templateData);
            setTemplates(prev => [...prev, response.data]);
        }
    };

    const handleDeleteTemplate = async (templateId) => {
        try {
            await api.deleteTemplate(templateId);
            setTemplates(prev => prev.filter(t => t.id !== templateId));
        } catch (error) {
            console.error("Failed to delete template", error);
        }
    };
    
    // Login/Logout Logic
    const handleLogin = async (email, password) => {
        try {
            const response = await api.login(email, password);
            localStorage.setItem('token', response.data.token);
            const userResponse = await api.getMe();
            setUser(userResponse.data);
            await loadAllData();
        } catch (error) {
            console.error("Login failed", error);
            // Показать ошибку пользователю
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        setUser(null);
        // Очищаем все данные
        setAccounts([]);
        setScheduledTasks([]);
        setLiveTasks([]);
        setTemplates([]);
    };

    const navigationItems = [
        { id: 'dashboard', label: 'Главная', icon: Rss },
        { id: 'accounts', label: 'Аккаунты', icon: Users },
        { id: 'scheduled', label: 'Задачи', icon: ListChecks },
        { id: 'live', label: 'Репост (Live)', icon: Zap },
        { id: 'templates', label: 'Шаблоны', icon: FileText },
        { id: 'settings', label: 'Настройки', icon: Settings },
    ];

    const CurrentPage = useMemo(() => {
        switch (activePage) {
            case 'dashboard': return <Dashboard setModal={setModal} />;
            case 'accounts': return <Accounts setModal={setModal} accounts={accounts} handleSaveAccount={handleSaveAccount} handleDeleteAccount={handleDeleteAccount} handleToggleAccountStatus={handleToggleAccountStatus} />;
            case 'scheduled': return <ScheduledTasks setModal={setModal} tasks={scheduledTasks} accounts={accounts} templates={templates} handleSaveTask={handleSaveScheduledTask} handleDeleteTask={handleDeleteScheduledTask} handleToggleTaskStatus={handleToggleScheduledTaskStatus} handleClearHistory={handleClearScheduledTaskHistory} />;
            case 'live': return <LiveReposts setModal={setModal} tasks={liveTasks} accounts={accounts} templates={templates} handleSaveTask={handleSaveLiveTask} handleDeleteTask={handleDeleteLiveTask} handleToggleTaskStatus={handleToggleLiveTaskStatus} />;
            case 'templates': return <Templates setModal={setModal} templates={templates} accounts={accounts} handleSaveTemplate={handleSaveTemplate} handleDeleteTemplate={handleDeleteTemplate} />;
            case 'settings': return <AppSettings />;
            default: return <Dashboard setModal={setModal} />;
        }
    }, [activePage, accounts, scheduledTasks, liveTasks, templates]);

    // Если пользователя нет, показываем заглушку для входа
    if (!user) {
        return <LoginScreen onLogin={handleLogin} />;
    }
    
    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 font-sans text-gray-800 dark:text-gray-200 flex">
            <aside className="w-64 bg-white dark:bg-gray-800 flex-shrink-0 p-4 flex-col shadow-lg hidden md:flex">
                <div className="flex items-center gap-3 px-4 mb-8"><Rss className="w-8 h-8 text-blue-600" /><h1 className="text-xl font-bold text-gray-900 dark:text-white">Social Reposter</h1></div>
                <nav className="flex-grow">
                    <ul>
                        {navigationItems.map(item => (
                            <li key={item.id}><button onClick={() => setActivePage(item.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activePage === item.id ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/50 dark:text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white'}`}><item.icon className="w-5 h-5" />{item.label}</button></li>
                        ))}
                    </ul>
                </nav>
                 <div className="mt-auto">
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/50 dark:hover:text-white">
                        <Key className="w-5 h-5" />
                        <span>Выйти</span>
                    </button>
                </div>
            </aside>
            <main className="flex-1 p-4 sm:p-8 overflow-auto">{CurrentPage}</main>
            <Modal modal={modal} setModal={setModal} />
        </div>
    );
}

// Простой компонент для входа
const LoginScreen = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isRegistering) {
                if (password !== confirmPassword) {
                    setError('Пароли не совпадают');
                    setLoading(false);
                    return;
                }
                // Регистрация
                await api.register(email, password);
                setIsRegistering(false);
                setError('');
                setEmail('');
                setPassword('');
                setConfirmPassword('');
                alert('Регистрация прошла успешно! Теперь вы можете войти в систему.');
            } else {
                // Вход
                await onLogin(email, password);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Произошла ошибка');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
            <div className="w-full max-w-md bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8">
                <div className="flex justify-center mb-6">
                    <Rss className="w-12 h-12 text-blue-600" />
                </div>
                <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-2">
                    {isRegistering ? 'Регистрация' : 'Вход в Social Reposter'}
                </h2>
                <p className="text-center text-gray-500 dark:text-gray-400 mb-8">
                    {isRegistering ? 'Создайте новый аккаунт' : 'Пожалуйста, войдите в свой аккаунт'}
                </p>

                {/* Тестовые данные для входа */}
                {!isRegistering && (
                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">Тестовый аккаунт:</p>
                        <p className="text-sm text-blue-600 dark:text-blue-300">📧 admin@example.com</p>
                        <p className="text-sm text-blue-600 dark:text-blue-300">🔑 123456</p>
                    </div>
                )}

                {error && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                        <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                        <input 
                            type="email" 
                            value={email} 
                            onChange={e => setEmail(e.target.value)} 
                            required 
                            className={inputStyleClasses} 
                            placeholder="you@example.com" 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Пароль</label>
                        <input 
                            type="password" 
                            value={password} 
                            onChange={e => setPassword(e.target.value)} 
                            required 
                            className={inputStyleClasses} 
                            placeholder="••••••••" 
                            minLength={6}
                        />
                    </div>
                    {isRegistering && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Подтвердите пароль</label>
                            <input 
                                type="password" 
                                value={confirmPassword} 
                                onChange={e => setConfirmPassword(e.target.value)} 
                                required 
                                className={inputStyleClasses} 
                                placeholder="••••••••" 
                                minLength={6}
                            />
                        </div>
                    )}
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full flex justify-center items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-colors text-base font-semibold disabled:bg-blue-400"
                    >
                        {loading ? (
                            <>
                                <Clock className="w-4 h-4 animate-spin" />
                                {isRegistering ? 'Регистрация...' : 'Вход...'}
                            </>
                        ) : (
                            isRegistering ? 'Зарегистрироваться' : 'Войти'
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button 
                        onClick={() => {
                            setIsRegistering(!isRegistering);
                            setError('');
                            setEmail('');
                            setPassword('');
                            setConfirmPassword('');
                        }}
                        className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                        {isRegistering ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Создаем новый компонент для модального окна с историей
const TaskHistoryModal = ({ task }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (task) {
            api.getTaskLogs(task.id)
                .then(res => setLogs(res.data))
                .catch(err => console.error(err))
                .finally(() => setLoading(false));
        }
    }, [task]);

    return (
        <div>
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">История задачи: {task.name}</h2>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-md max-h-96 overflow-y-auto p-4">
                {loading ? <p>Загрузка истории...</p> : logs.length === 0 ? <p>Для этой задачи еще нет записей в истории.</p> : (
                    <ul className="space-y-3">
                        {logs.map(log => (
                             <li key={log.id} className="flex items-center space-x-3 p-2 rounded-lg">
                                {log.level === 'success' ? <CheckCircle className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
                                <p className="text-sm text-gray-800 dark:text-gray-200">{log.message}</p>
                                <span className="text-xs text-gray-400 ml-auto flex-shrink-0">{new Date(log.createdAt).toLocaleString()}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};
