      const API_URL = "api.php";
      let board = Array(64).fill("");
      let gameOver = false;
      let saveTimeout = null;

      function initBoard() {
        const boardEl = document.getElementById("board");
        boardEl.innerHTML = "";

        for (let i = 0; i < 64; i++) {
          const btn = document.createElement("button");
          btn.className = "cell";
          btn.onclick = () => handleMove(i);
          boardEl.appendChild(btn);
        }

        updateBoard();
      }

      function updateBoard() {
        const cells = document.querySelectorAll(".cell");
        cells.forEach((cell, i) => {
          cell.textContent = board[i];
          cell.className = "cell " + board[i].toLowerCase();
          cell.disabled = board[i] !== "" || gameOver;
        });
      }

      function handleMove(index) {
        if (board[index] !== "" || gameOver) return;

        board[index] = "X";
        updateBoard();
        debouncedSave();

        if (checkWin("X")) {
          setMessage("You win!");
          gameOver = true;
          debouncedSave();
          return;
        }

        if (!board.includes("")) {
          setMessage("Draw!");
          gameOver = true;
          debouncedSave();
          return;
        }

        setTimeout(() => {
          const aiMove = getAIMove();
          if (aiMove !== null) {
            board[aiMove] = "O";
            updateBoard();
            debouncedSave();

            if (checkWin("O")) {
              setMessage("AI wins!");
              gameOver = true;
              debouncedSave();
            } else if (!board.includes("")) {
              setMessage("Draw!");
              gameOver = true;
              debouncedSave();
            } else {
              setMessage("Your turn (X)");
            }
          }
        }, 200);
      }

      function debouncedSave() {
        if (saveTimeout) {
          clearTimeout(saveTimeout);
        }

        saveTimeout = setTimeout(() => {
          saveGame();
        }, 1000);
      }

      async function saveGame() {
        try {
          const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "save",
              board: board,
              gameOver: gameOver,
              message: document.getElementById("message").textContent,
            }),
          });

          const data = await response.json();

          if (data.success) {
            showSaveStatus();
          }
        } catch (error) {
          console.error("Save error:", error);
        }
      }

      function showSaveStatus() {
        const statusEl = document.getElementById("status");
        statusEl.classList.add("visible");

        setTimeout(() => {
          statusEl.classList.remove("visible");
        }, 2000);
      }

      function checkWin(player) {
        const size = 8;

        for (let row = 0; row < size; row++) {
          for (let col = 0; col < size; col++) {
            const pos = row * size + col;
            if (board[pos] !== player) continue;

            if (col <= 4 && checkLine(pos, 1, 4, player)) return true;
            if (row <= 4 && checkLine(pos, size, 4, player)) return true;
            if (row <= 4 && col <= 4 && checkLine(pos, size + 1, 4, player))
              return true;
            if (row <= 4 && col >= 3 && checkLine(pos, size - 1, 4, player))
              return true;
          }
        }
        return false;
      }

      function checkLine(start, step, count, player) {
        for (let i = 0; i < count; i++) {
          if (board[start + i * step] !== player) return false;
        }
        return true;
      }

      function getAIMove() {
        let move = findWinningMove("O");
        if (move !== null) return move;

        move = findWinningMove("X");
        if (move !== null) return move;

        move = findOpenThree("O");
        if (move !== null) return move;

        move = findOpenThree("X");
        if (move !== null) return move;

        move = extendLine("O");
        if (move !== null) return move;

        move = extendLine("X");
        if (move !== null) return move;

        move = moveNearby();
        if (move !== null) return move;

        const center = [27, 28, 35, 36];
        for (const pos of center) {
          if (board[pos] === "") return pos;
        }

        const empty = board
          .map((v, i) => (v === "" ? i : null))
          .filter((v) => v !== null);
        return empty.length
          ? empty[Math.floor(Math.random() * empty.length)]
          : null;
      }

      function findWinningMove(player) {
        for (let i = 0; i < 64; i++) {
          if (board[i] === "") {
            board[i] = player;
            const wins = checkWin(player);
            board[i] = "";
            if (wins) return i;
          }
        }
        return null;
      }

      function findOpenThree(player) {
        const size = 8;
        for (let row = 0; row < size; row++) {
          for (let col = 0; col < size; col++) {
            const pos = row * size + col;
            if (board[pos] !== "") continue;

            board[pos] = player;
            const directions = [
              [1, 0],
              [0, 1],
              [1, 1],
              [1, -1],
            ];

            for (const [dr, dc] of directions) {
              let count = 1;
              let openEnds = 0;

              for (let k = 1; k < 4; k++) {
                const r = row + k * dr;
                const c = col + k * dc;
                if (r < 0 || r >= size || c < 0 || c >= size) break;
                const p = r * size + c;
                if (board[p] === player) count++;
                else {
                  if (board[p] === "") openEnds++;
                  break;
                }
              }

              for (let k = 1; k < 4; k++) {
                const r = row - k * dr;
                const c = col - k * dc;
                if (r < 0 || r >= size || c < 0 || c >= size) break;
                const p = r * size + c;
                if (board[p] === player) count++;
                else {
                  if (board[p] === "") openEnds++;
                  break;
                }
              }

              if (count >= 3 && openEnds >= 2) {
                board[pos] = "";
                return pos;
              }
            }
            board[pos] = "";
          }
        }
        return null;
      }

      function extendLine(player) {
        const size = 8;
        const directions = [
          [1, 0],
          [0, 1],
          [1, 1],
          [1, -1],
        ];

        for (let row = 0; row < size; row++) {
          for (let col = 0; col < size; col++) {
            const pos = row * size + col;
            if (board[pos] !== player) continue;

            for (const [dr, dc] of directions) {
              for (let dist = 1; dist <= 3; dist++) {
                const r = row + dist * dr;
                const c = col + dist * dc;
                if (r < 0 || r >= size || c < 0 || c >= size) break;
                const p = r * size + c;
                if (board[p] === "") return p;
                if (board[p] !== player) break;
              }
            }
          }
        }
        return null;
      }

      function moveNearby() {
        const size = 8;
        const neighbors = [
          [-1, -1],
          [-1, 0],
          [-1, 1],
          [0, -1],
          [0, 1],
          [1, -1],
          [1, 0],
          [1, 1],
        ];

        for (let row = 0; row < size; row++) {
          for (let col = 0; col < size; col++) {
            const pos = row * size + col;
            if (board[pos] === "") continue;

            for (const [dr, dc] of neighbors) {
              const r = row + dr;
              const c = col + dc;
              if (r >= 0 && r < size && c >= 0 && c < size) {
                const p = r * size + c;
                if (board[p] === "") return p;
              }
            }
          }
        }
        return null;
      }

      function setMessage(msg) {
        document.getElementById("message").textContent = msg;
      }

      async function loadGame() {
        try {
          const response = await fetch(API_URL);
          const data = await response.json();

          board = data.board;
          gameOver = data.gameOver;
          setMessage(data.message);
          updateBoard();
        } catch (error) {
          console.error("Load error:", error);
        }
      }

      async function resetGame() {
        try {
          const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "reset" }),
          });

          const data = await response.json();

          if (data.success) {
            board = data.board;
            gameOver = data.gameOver;
            setMessage(data.message);
            updateBoard();
          }
        } catch (error) {
          console.error("Reset error:", error);
          board = Array(64).fill("");
          gameOver = false;
          setMessage("Your turn (X)");
          updateBoard();
        }
      }

      async function init() {
        initBoard();
        await loadGame();
      }

      init();