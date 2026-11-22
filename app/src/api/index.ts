/**
 * Сервисный слой — точка входа. Методы разложены по модулям `./modules/*`
 * (инструмент = файл). Импорт в приложении: `from '../api'`.
 * Новый модуль = файл в modules/ + строка ниже (генератор добавит сам).
 */
export * from './modules/core';
export * from './modules/auth';
export * from './modules/users';
export * from './modules/notifications';
export * from './modules/tools';
export * from './modules/files';
export * from './modules/telegram';
export * from './modules/projects';
