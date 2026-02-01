import { By, until, WebElement, type WebDriver } from 'selenium-webdriver';

export interface ParseResult {
  result: 'win' | 'lose' | 'draw';
  field: string[][];
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
      field[j][i] = cell.trim()
    }
  }
  return field
}

// Конвертация индекса в координаты матрицы
const indexToCoords = (index: number): [number, number] => {
  return [Math.floor(index / 8), index % 8]
}

// Конвертация координат матрицы в индекс
const coordsToIndex = (row: number, col: number): number => {
  return row * 8 + col
}

// Проверка победы для игрока
const checkWin = (field: string[][], player: string): boolean => {
  const directions = [
    [0, 1],    // горизонталь
    [1, 0],    // вертикаль
    [1, 1],    // диагональ \
    [1, -1]    // диагональ /
  ]

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (field[row][col] !== player) continue

      for (const [dx, dy] of directions) {
        let count = 1

        // Проверяем в одном направлении
        for (let i = 1; i < 4; i++) {
          const r = row + i * dx
          const c = col + i * dy
          if (r < 0 || r >= 8 || c < 0 || c >= 8) break
          if (field[r][c] === player) count++
          else break
        }

        // Проверяем в противоположном направлении
        for (let i = 1; i < 4; i++) {
          const r = row - i * dx
          const c = col - i * dy
          if (r < 0 || r >= 8 || c < 0 || c >= 8) break
          if (field[r][c] === player) count++
          else break
        }

        if (count >= 4) return true
      }
    }
  }

  return false
}

// Проверка ничьей (все клетки заняты)
const checkDraw = (field: string[][]): boolean => {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (!field[row][col] || field[row][col].trim() === '') {
        return false
      }
    }
  }
  return true
}

// Получение пустых клеток
const getEmptyCells = (field: string[][]): number[] => {
  const empty: number[] = []
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (!field[row][col] || field[row][col].trim() === '') {
        empty.push(coordsToIndex(row, col))
      }
    }
  }
  return empty
}

// Анализ линии для оценки позиции
const evaluateLine = (
  line: string[],
  player: string,
  opponent: string
): { score: number; isThreat: boolean } => {
  const playerCount = line.filter(c => c === player).length
  const opponentCount = line.filter(c => c === opponent).length
  const emptyCount = line.filter(c => !c || c.trim() === '').length

  // Смешанная линия
  if (opponentCount > 0 && playerCount > 0) {
    return { score: 0, isThreat: false }
  }

  // Выигрышная линия
  if (playerCount === 4) {
    return { score: 100000, isThreat: true }
  }

  // Критическая угроза противника (3 противника, 1 пустая)
  if (opponentCount === 3 && emptyCount === 1) {
    return { score: -50000, isThreat: false }
  }

  // Угроза противника (2 противника, 2 пустых с потенциалом)
  if (opponentCount === 2 && emptyCount === 2) {
    return { score: -5000, isThreat: false }
  }

  // Угроза противника (1 противник, 3 пустых)
  if (opponentCount === 1 && emptyCount === 3) {
    return { score: -500, isThreat: false }
  }

  // Открытая тройка
  if (playerCount === 3 && emptyCount === 1) {
    const hasOpenEnds = (line[0] === '' || line[0].trim() === '') &&
                        (line[line.length - 1] === '' || line[line.length - 1].trim() === '')
    if (hasOpenEnds) {
      return { score: 5000, isThreat: true }
    }
    return { score: 1000, isThreat: false }
  }

  // Открытая двойка
  if (playerCount === 2 && emptyCount === 2) {
    return { score: 100, isThreat: false }
  }

  // Одиночная угроза
  if (playerCount === 1 && emptyCount === 3) {
    return { score: 10, isThreat: false }
  }

  return { score: 0, isThreat: false }
}

// Анализ позиции для конкретной клетки
const analyzePosition = (
  field: string[][],
  row: number,
  col: number,
  player: string,
  opponent: string
): { score: number; threats: number } => {
  let score = 0
  let threats = 0

  const directions = [
    [0, 1],    // горизонталь
    [1, 0],    // вертикаль
    [1, 1],    // диагональ \
    [1, -1]    // диагональ /
  ]

  for (const [dx, dy] of directions) {
    // Собираем все возможные линии из 4 клеток
    for (let offset = -3; offset <= 0; offset++) {
      const line: string[] = []
      let valid = true

      for (let i = 0; i < 4; i++) {
        const r = row + (offset + i) * dx
        const c = col + (offset + i) * dy

        if (r < 0 || r >= 8 || c < 0 || c >= 8) {
          valid = false
          break
        }
        line.push(field[r][c] || '')
      }

      if (!valid) continue

      const lineScore = evaluateLine(line, player, opponent)
      score += lineScore.score
      if (lineScore.isThreat) threats++
    }
  }

  return { score, threats }
}

// Бонус за центральные позиции
const getCenterBonus = (index: number): number => {
  const row = Math.floor(index / 8)
  const col = index % 8
  const center = 3.5
  const distance = Math.abs(row - center) + Math.abs(col - center)
  return Math.max(0, 20 - Math.floor(distance * 3))
}

// Штраф за изоляцию
const getIsolationPenalty = (field: string[][], index: number): number => {
  const row = Math.floor(index / 8)
  const col = index % 8
  let penalty = 0

  const neighbors = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
  ]

  let emptyNeighbors = 0
  for (const [dr, dc] of neighbors) {
    const r = row + dr
    const c = col + dc
    if (r >= 0 && r < 8 && c >= 0 && c < 8) {
      if (!field[r][c] || field[r][c].trim() === '') {
        emptyNeighbors++
      }
    }
  }

  // Штраф за полную изоляцию
  if (emptyNeighbors === 8) {
    penalty = 50
  }

  return penalty
}

// Проверка открытой тройки (3 в ряд с 2 открытыми концами)
const findOpenThree = (field: string[][], player: string): number | null => {
  const directions = [
    [0, 1],    // горизонталь
    [1, 0],    // вертикаль
    [1, 1],    // диагональ \
    [1, -1]    // диагональ /
  ]

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (field[row][col] !== '') continue

      for (const [dx, dy] of directions) {
        let count = 0
        let openEnds = 0

        // Проверяем в одном направлении
        for (let i = 1; i < 4; i++) {
          const r = row + i * dx
          const c = col + i * dy
          if (r < 0 || r >= 8 || c < 0 || c >= 8) break
          if (field[r][c] === player) count++
          else if (field[r][c] === '') {
            openEnds++
            break
          } else break
        }

        // Проверяем в противоположном направлении
        for (let i = 1; i < 4; i++) {
          const r = row - i * dx
          const c = col - i * dy
          if (r < 0 || r >= 8 || c < 0 || c >= 8) break
          if (field[r][c] === player) count++
          else if (field[r][c] === '') {
            openEnds++
            break
          } else break
        }

        if (count >= 3 && openEnds >= 2) {
          return coordsToIndex(row, col)
        }
      }
    }
  }
  return null
}

// Проверка закрытой тройки (3 в ряд с 1 открытым концом) - критическая угроза
const findClosedThree = (field: string[][], player: string): number | null => {
  const directions = [
    [0, 1],    // горизонталь
    [1, 0],    // вертикаль
    [1, 1],    // диагональ \
    [1, -1]    // диагональ /
  ]

  // Ищем все линии, где у игрока 3 в ряд
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (field[row][col] !== player) continue

      for (const [dx, dy] of directions) {
        let count = 1 // считаем текущую клетку
        let openEnds: number[] = []

        // Проверяем в одном направлении
        for (let i = 1; i < 4; i++) {
          const r = row + i * dx
          const c = col + i * dy
          if (r < 0 || r >= 8 || c < 0 || c >= 8) break
          if (field[r][c] === player) {
            count++
          } else if (field[r][c] === '') {
            openEnds.push(coordsToIndex(r, c))
            break
          } else {
            break
          }
        }

        // Проверяем в противоположном направлении
        for (let i = 1; i < 4; i++) {
          const r = row - i * dx
          const c = col - i * dy
          if (r < 0 || r >= 8 || c < 0 || c >= 8) break
          if (field[r][c] === player) {
            count++
          } else if (field[r][c] === '') {
            openEnds.push(coordsToIndex(r, c))
            break
          } else {
            break
          }
        }

        // Если 3 в ряд и есть хотя бы 1 открытый конец - это критическая угроза
        if (count >= 3 && openEnds.length >= 1) {
          // Возвращаем первую позицию для блокировки
          return openEnds[0]
        }
      }
    }
  }
  return null
}

// Поиск лучшего хода
const findBestMove = (field: string[][], player: string, opponent: string): number => {
  const emptyCells = getEmptyCells(field)
  if (emptyCells.length === 0) return -1

  interface Move {
    index: number
    score: number
    threats: number
  }

  // 1. Выигрыш (критический приоритет)
  for (const index of emptyCells) {
    const [row, col] = indexToCoords(index)
    field[row][col] = player
    if (checkWin(field, player)) {
      field[row][col] = ''
      return index
    }
    field[row][col] = ''
  }

  // 2. Блокировка выигрыша противника (критический приоритет)
  for (const index of emptyCells) {
    const [row, col] = indexToCoords(index)
    field[row][col] = opponent
    if (checkWin(field, opponent)) {
      field[row][col] = ''
      return index
    }
    field[row][col] = ''
  }

  // 3. Блокировка закрытой тройки противника (3 в ряд с 1 открытым концом) - критично!
  const opponentClosedThree = findClosedThree(field, opponent)
  if (opponentClosedThree !== null) {
    return opponentClosedThree
  }

  // 4. Создание открытой тройки для себя
  const myOpenThree = findOpenThree(field, player)
  if (myOpenThree !== null) {
    return myOpenThree
  }

  // 5. Блокировка открытой тройки противника
  const opponentOpenThree = findOpenThree(field, opponent)
  if (opponentOpenThree !== null) {
    return opponentOpenThree
  }

  // 5. Оценка всех остальных ходов
  const moves: Move[] = []

  for (const index of emptyCells) {
    const [row, col] = indexToCoords(index)
    let score = 0
    let threats = 0

    // Симулируем ход
    field[row][col] = player

    // Анализ угроз и потенциала
    const analysis = analyzePosition(field, row, col, player, opponent)
    score = analysis.score
    threats = analysis.threats

    // Бонус за центральные позиции
    const centerBonus = getCenterBonus(index)
    score += centerBonus

    // Штраф за изоляцию
    const isolationPenalty = getIsolationPenalty(field, index)
    score -= isolationPenalty

    field[row][col] = '' // откат

    moves.push({ index, score, threats })
  }

  // Сортировка: сначала по количеству угроз, потом по оценке
  moves.sort((a, b) => {
    if (b.threats !== a.threats) return b.threats - a.threats
    return b.score - a.score
  })

  // Возвращаем лучший ход
  return moves[0].index
}

// Выполнение хода игрока
const makePlayerMove = async (
  driver: WebDriver,
  body: WebElement,
  field: string[][],
  player: string,
  opponent: string
): Promise<number> => {
  const bestMove = findBestMove(field, player, opponent)
  if (bestMove === -1) {
    throw new Error('No available moves')
  }
  await doTurn(driver, body, bestMove)
  // Небольшая задержка для обновления поля на странице
  await new Promise(resolve => setTimeout(resolve, 100))
  return bestMove
}

export async function launchGame(driver: WebDriver, baseUrl: string): Promise<ParseResult> {
  await driver.get(baseUrl);

  const body = await driver.wait(until.elementLocated(By.css('body')), 5000);
  const PLAYER = 'X'
  const OPPONENT = 'O'
  const MAX_MOVES = 64 // максимальное количество ходов на доске 8x8

  let moveCount = 0

  while (moveCount < MAX_MOVES) {
    // Получаем текущее состояние поля
    let field = await getField(body)

    // Проверяем победу противника (он ходит первым после нашего хода)
    if (checkWin(field, OPPONENT)) {
      return {
        result: 'lose',
        field: field
      }
    }

    // Проверяем ничью
    if (checkDraw(field)) {
      return {
        result: 'draw',
        field: field
      }
    }

    // Делаем ход игрока
    await makePlayerMove(driver, body, field, PLAYER, OPPONENT)
    moveCount++

    // Обновляем поле после нашего хода
    field = await getField(body)

    // Проверяем победу игрока
    if (checkWin(field, PLAYER)) {
      return {
        result: 'win',
        field: field
      }
    }

    // Проверяем ничью после нашего хода
    if (checkDraw(field)) {
      return {
        result: 'draw',
        field: field
      }
    }

    // Ждём ход противника
    await waitForAi(driver, body)
    moveCount++

    // Обновляем поле после хода противника
    field = await getField(body)

    // Проверяем победу противника
    if (checkWin(field, OPPONENT)) {
      return {
        result: 'lose',
        field: field
      }
    }

    // Проверяем ничью
    if (checkDraw(field)) {
      return {
        result: 'draw',
        field: field
      }
    }
  }

  // Если достигли максимального количества ходов (не должно произойти)
  const finalField = await getField(body)
  return {
    result: 'draw',
    field: finalField
  }
}

