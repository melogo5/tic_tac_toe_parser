# selenium-parser

Проект для парсинга сайтов с помощью Selenium WebDriver на TypeScript.

## Требования

1. **Google Chrome** — должен быть установлен в системе
2. **ChromeDriver** — должен быть установлен и добавлен в PATH
   - Скачайте с [Chrome for Testing](https://googlechromelabs.github.io/chrome-for-testing/)
   - Распакуйте `chromedriver.exe` в папку (например, `C:\Selenium\`)
   - Добавьте путь к папке в переменную окружения PATH
   - Проверьте: `chromedriver --version` в PowerShell

## Быстрый старт

1. Установите зависимости: `npm install`
2. Создайте файл `.env` и задайте `BASE_URL`:
   ```
   BASE_URL=https://example.com
   ```
3. Запустите в режиме разработки: `npm run dev`  
   Или соберите и запустите: `npm run build && npm start`

## Структура

- `src/index.ts` — точка входа, инициализация драйвера и вызов парсера
- `src/createDriver.ts` — создание WebDriver для Chrome (использует ChromeDriver из PATH)
- `src/parser.ts` — функции парсинга

## Заметки

- Проект использует ChromeDriver из системного PATH, а не из npm пакета
- ChromeDriver автоматически находится через переменную окружения PATH
- Для добавления опций Chrome (headless, размер окна и т.д.) отредактируйте `src/createDriver.ts`

