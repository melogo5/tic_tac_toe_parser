import { By, until, WebElement, type WebDriver } from 'selenium-webdriver';

export interface ParseResult {
  result: string;
}

const waitForAi = async (driver: WebDriver, body: WebElement) => {
  const successElement = body.findElement(By.className('status'))
  await driver.wait(until.elementIsVisible(successElement))
  await driver.wait(until.elementIsNotVisible(successElement))
}

const doTurn = async (driver: WebDriver, body: WebElement, index: number) => {
  const cells = await body.findElements(By.className('cell'))
  await cells[index].click()
}

const getField = async (body: WebElement) => {
  const FIELD_WIDTH = 8
  const FIELD_HEIGHT = 8
  const field: string[][] = [[], [], [], [], [], [], [], []]
  const cells = await body.findElements(By.className('cell'))
  for (let i = 0; i < FIELD_WIDTH; i++) {
    for (let j = 0; j < FIELD_HEIGHT; j++) {
      const cell = await cells[j * FIELD_HEIGHT + i].getText();
      field[j][i] = cell
    }
  }
  return field
}

export async function launchGame(driver: WebDriver, baseUrl: string): Promise<ParseResult> {
  await driver.get(baseUrl);

  // Пример ожидания элемента на странице.
  const body = await driver.wait(until.elementLocated(By.css('body')), 5000);
  await doTurn(driver, body, 0)
  await waitForAi(driver, body)
  console.log(await getField(body))
  await doTurn(driver, body, 1)
  await waitForAi(driver, body)
  console.log(await getField(body))
  return {
    result: 'win',
  };
}

