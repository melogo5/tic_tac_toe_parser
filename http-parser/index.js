import fetch from 'node-fetch';
import fetchCookie from 'fetch-cookie';
import { CookieJar } from 'tough-cookie';
import * as cheerio from 'cheerio';

const jar = new CookieJar();
const fetchWithCookies = fetchCookie(fetch, jar);

const url = 'https://tashchyan.ru/courses/tg-multiaccount/materials/1.2/mpa/index.php';

const getBoard = async () => {
    const response = await fetchWithCookies(url);
    const html = await response.text();
    const $ = cheerio.load(html);

    // 64 клетки в одном form.board
    const cells = $('form.board button.cell');

    const board = Array.from({ length: 8 }, () =>
        Array(8).fill(null)
    );

    cells.each((_, el) => {
        const value = Number($(el).attr('value'));
        const row = Math.floor(value / 8);
        const col = value % 8;

        const text = $(el).text().trim();

        if (text === 'X') board[row][col] = 'X';
        else if (text === 'O') board[row][col] = 'O';
        else board[row][col] = null;
    });
    console.table(board)
    return board;
}

const DIRS = [
    [1, 0],   // вертикаль
    [0, 1],   // горизонталь
    [1, 1],   // диагональ \
    [1, -1],  // диагональ /
  ];
  
function inBounds(r, c) {
    return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function isWinningMove(board, row, col, player) {
    for (const [dr, dc] of DIRS) {
        let count = 1;

        for (let k = 1; k < 4; k++) {
        const r = row + dr * k;
        const c = col + dc * k;
        if (!inBounds(r, c) || board[r][c] !== player) break;
        count++;
        }

        for (let k = 1; k < 4; k++) {
        const r = row - dr * k;
        const c = col - dc * k;
        if (!inBounds(r, c) || board[r][c] !== player) break;
        count++;
        }

        if (count >= 4) return true;
    }
    return false;
}

const getFreeCells = (board) => {
const cells = [];
for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
    if (!board[r][c]) cells.push([r, c]);
    }
}
return cells;
}

const scorePosition = (board, row, col, player) => {
    let score = 0;

    for (const [dr, dc] of DIRS) {
        let count = 1;
        let openEnds = 0;

        for (let k = 1; k < 4; k++) {
        const r = row + dr * k;
        const c = col + dc * k;
        if (!inBounds(r, c)) break;
        if (board[r][c] === player) count++;
        else {
            if (!board[r][c]) openEnds++;
            break;
        }
        }

        for (let k = 1; k < 4; k++) {
        const r = row - dr * k;
        const c = col - dc * k;
        if (!inBounds(r, c)) break;
        if (board[r][c] === player) count++;
        else {
            if (!board[r][c]) openEnds++;
            break;
        }
        }

        if (count === 3 && openEnds > 0) score += 100;
        else if (count === 2) score += 10;
        else if (count === 1) score += 1;
    }

    return score;
}
  
  
function findBestMove(board, me = 'X', enemy = 'O') {
    const free = getFreeCells(board);

    // 1️⃣ выиграть сейчас
    for (const [r, c] of free) {
        board[r][c] = me;
        if (isWinningMove(board, r, c, me)) {
        board[r][c] = null;
        return [r, c];
        }
        board[r][c] = null;
    }

    // 2️⃣ заблокировать проигрыш
    for (const [r, c] of free) {
        board[r][c] = enemy;
        if (isWinningMove(board, r, c, enemy)) {
        board[r][c] = null;
        return [r, c];
        }
        board[r][c] = null;
    }

    // 3️⃣ создать 3 в ряд (угроза)
    let best = null;
    let bestScore = -Infinity;

    for (const [r, c] of free) {
        const score =
        scorePosition(board, r, c, me) -
        scorePosition(board, r, c, enemy) * 1.1;

        if (score > bestScore) {
        bestScore = score;
        best = [r, c];
        }
    }

    return best;
}

const hasWinner = (board, player) => {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
        if (board[r][c] !== player) continue;
        if (isWinningMove(board, r, c, player)) {
            return true;
        }
        }
    }
    return false;
}

const isDraw = (board) => {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
        if (board[r][c] === null) return false;
        }
    }
    return true;
}

const sendMove = async (index) => {
    const bodyFormData = new FormData();
    bodyFormData.append('cell', index);
    const response = await fetchWithCookies(url, {
        method: 'POST',
        body: bodyFormData,
        redirect: 'manual',
    });
}

const resetGame = async () => {
    const bodyFormData = new FormData();
    bodyFormData.append('reset', '');
    await fetchWithCookies(url, {
        method: 'POST',
        body: bodyFormData,
    });
    // console.log(await response.text())
}

function getTurn(html) {
    const $ = cheerio.load(html);
    const msg = $('.message').text();

    if (msg.includes('(X)')) return 'X';
    if (msg.includes('(O)')) return 'O';

    return null;
}

const gameLoop = async () => {
    let moves = 0;
    while (true) {
        if (++moves > 100) break;
        // 1️⃣ получаем текущее состояние

        const board = await getBoard()

        // 2️⃣ условия остановки
        if (hasWinner(board, 'X')) {
            console.log('🏆 BOT WINS');
            break;
        }

        if (hasWinner(board, 'O')) {
            console.log('💀 BOT LOSES');
            break;
        }

        if (isDraw(board)) {
            console.log('🤝 DRAW');
            break;
        }

        // // 3️⃣ если сейчас не наш ход — ждём
        // if (turn !== 'X') {
        //     await sleep(500);
        //     continue;
        // }

        // 4️⃣ считаем лучший ход
        const [r, c] = findBestMove(board, 'X', 'O');
        const cell = r * 8 + c;

        console.log(`🤖 bot move → ${cell}`);

        // 5️⃣ отправляем ход
        await sendMove(cell);
    }
}

// console.log('Сбрасываю игру')
// await resetGame()
// console.log('Хожу')
// await sendMove(11)

// console.log('Фетчу страницу')
// await getBoard()

// console.log('Хожу')
// await sendMove(12)

// console.log('Фетчу страницу')
// await getBoard()
gameLoop()