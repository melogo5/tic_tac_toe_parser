import { Builder, type WebDriver, Browser } from 'selenium-webdriver';

/**
 * Создаёт и возвращает экземпляр WebDriver для Chrome.
 * Требует, чтобы ChromeDriver был установлен и добавлен в PATH.
 * 
 * @returns Promise<WebDriver> - экземпляр WebDriver для Chrome
 */
export const createDriver = async (): Promise<WebDriver> => {
  // Создаём драйвер - ChromeDriver должен быть в PATH
  // Selenium автоматически найдёт chromedriver.exe из переменной окружения PATH
  const driver = await new Builder()
    .forBrowser(Browser.CHROME)
    .build();

  return driver;
}

