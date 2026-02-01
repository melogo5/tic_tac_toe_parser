import fetch from 'node-fetch';
import fetchCookie from 'fetch-cookie';
import { CookieJar } from 'tough-cookie';
import * as cheerio from 'cheerio';

const jar = new CookieJar();
const fetchWithCookies = fetchCookie(fetch, jar);

const url = 'https://tashchyan.ru/courses/tg-multiaccount/materials/1.2/mpa/index.php';

const getField = async () => {
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

console.log('Сбрасываю игру')
await resetGame()
console.log('Хожу')
await sendMove(11)

console.log('Фетчу страницу')
await getField()

console.log('Хожу')
await sendMove(12)

console.log('Фетчу страницу')
await getField()
