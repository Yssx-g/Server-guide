const tabs = [...document.querySelectorAll(".game-tab")];
const titleEl = document.querySelector("#gameTitle");
const scoreEl = document.querySelector("#score");
const restartBtn = document.querySelector("#restartBtn");
const boards = {
  snake: document.querySelector("#snakeGame"),
  tetris: document.querySelector("#tetrisGame"),
  mines: document.querySelector("#minesGame"),
  memory: document.querySelector("#memoryGame"),
  tile2048: document.querySelector("#tile2048Game"),
  breakout: document.querySelector("#breakoutGame"),
};
const gameNames = {
  snake: "贪吃蛇",
  tetris: "俄罗斯方块",
  mines: "扫雷",
  memory: "记忆翻牌",
  tile2048: "2048",
  breakout: "打砖块",
};
let activeGame = "snake";
let snakeTimer = null;
let tetrisTimer = null;
let breakoutFrame = null;

function setScore(value) {
  scoreEl.textContent = String(value);
}

function stopLoops() {
  clearInterval(snakeTimer);
  clearInterval(tetrisTimer);
  if (breakoutFrame) cancelAnimationFrame(breakoutFrame);
  snakeTimer = null;
  tetrisTimer = null;
  breakoutFrame = null;
}

function switchGame(name) {
  activeGame = name;
  tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.game === name));
  Object.entries(boards).forEach(([key, board]) => board.classList.toggle("active", key === name));
  titleEl.textContent = gameNames[name];
  restartActiveGame();
}

function restartActiveGame() {
  stopLoops();
  if (activeGame === "snake") startSnake();
  if (activeGame === "tetris") startTetris();
  if (activeGame === "mines") startMines();
  if (activeGame === "memory") startMemory();
  if (activeGame === "tile2048") start2048();
  if (activeGame === "breakout") startBreakout();
}

tabs.forEach((tab) => tab.addEventListener("click", () => switchGame(tab.dataset.game)));
restartBtn.addEventListener("click", restartActiveGame);

// Snake
const snakeCanvas = document.querySelector("#snakeCanvas");
const snakeCtx = snakeCanvas.getContext("2d");
let snake;
let food;
let snakeDir;
let nextSnakeDir;
let snakeScore;

function startSnake() {
  snake = [{ x: 9, y: 9 }];
  food = randomCell(20, 20);
  snakeDir = { x: 1, y: 0 };
  nextSnakeDir = snakeDir;
  snakeScore = 0;
  setScore(0);
  drawSnake();
  snakeTimer = setInterval(tickSnake, 115);
}

function randomCell(w, h) {
  return { x: Math.floor(Math.random() * w), y: Math.floor(Math.random() * h) };
}

function tickSnake() {
  snakeDir = nextSnakeDir;
  const head = { x: snake[0].x + snakeDir.x, y: snake[0].y + snakeDir.y };
  const hitWall = head.x < 0 || head.y < 0 || head.x >= 20 || head.y >= 20;
  const hitSelf = snake.some((part) => part.x === head.x && part.y === head.y);
  if (hitWall || hitSelf) {
    restartActiveGame();
    return;
  }
  snake.unshift(head);
  if (head.x === food.x && head.y === food.y) {
    snakeScore += 10;
    setScore(snakeScore);
    food = randomCell(20, 20);
  } else {
    snake.pop();
  }
  drawSnake();
}

function drawSnake() {
  const size = snakeCanvas.width / 20;
  snakeCtx.fillStyle = "#050816";
  snakeCtx.fillRect(0, 0, snakeCanvas.width, snakeCanvas.height);
  snakeCtx.fillStyle = "#fb7185";
  snakeCtx.fillRect(food.x * size + 3, food.y * size + 3, size - 6, size - 6);
  snake.forEach((part, index) => {
    snakeCtx.fillStyle = index === 0 ? "#67e8f9" : "#34d399";
    snakeCtx.fillRect(part.x * size + 2, part.y * size + 2, size - 4, size - 4);
  });
}

function setSnakeDirection(dir) {
  const map = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };
  const next = map[dir];
  if (!next) return;
  if (snakeDir.x + next.x === 0 && snakeDir.y + next.y === 0) return;
  nextSnakeDir = next;
}

// Tetris
const tetrisCanvas = document.querySelector("#tetrisCanvas");
const tctx = tetrisCanvas.getContext("2d");
const tetrisCols = 10;
const tetrisRows = 20;
const tetrisSize = 30;
const shapes = [
  [[1, 1, 1, 1]],
  [[1, 1], [1, 1]],
  [[0, 1, 0], [1, 1, 1]],
  [[1, 0, 0], [1, 1, 1]],
  [[0, 0, 1], [1, 1, 1]],
  [[1, 1, 0], [0, 1, 1]],
  [[0, 1, 1], [1, 1, 0]],
];
let tetrisGrid;
let piece;
let tetrisScore;

function startTetris() {
  tetrisGrid = Array.from({ length: tetrisRows }, () => Array(tetrisCols).fill(0));
  tetrisScore = 0;
  piece = newPiece();
  setScore(0);
  drawTetris();
  tetrisTimer = setInterval(() => moveTetris(0, 1), 520);
}

function newPiece() {
  const shape = shapes[Math.floor(Math.random() * shapes.length)].map((row) => [...row]);
  return { shape, x: Math.floor((tetrisCols - shape[0].length) / 2), y: 0, color: Math.ceil(Math.random() * 6) };
}

function rotate(shape) {
  return shape[0].map((_, x) => shape.map((row) => row[x]).reverse());
}

function collides(nextPiece) {
  return nextPiece.shape.some((row, y) => row.some((cell, x) => {
    if (!cell) return false;
    const px = nextPiece.x + x;
    const py = nextPiece.y + y;
    return px < 0 || px >= tetrisCols || py >= tetrisRows || (py >= 0 && tetrisGrid[py][px]);
  }));
}

function mergePiece() {
  piece.shape.forEach((row, y) => row.forEach((cell, x) => {
    if (cell && piece.y + y >= 0) tetrisGrid[piece.y + y][piece.x + x] = piece.color;
  }));
  const before = tetrisGrid.length;
  tetrisGrid = tetrisGrid.filter((row) => row.some((cell) => !cell));
  const cleared = before - tetrisGrid.length;
  while (tetrisGrid.length < tetrisRows) tetrisGrid.unshift(Array(tetrisCols).fill(0));
  if (cleared) {
    tetrisScore += cleared * 100;
    setScore(tetrisScore);
  }
  piece = newPiece();
  if (collides(piece)) restartActiveGame();
}

function moveTetris(dx, dy) {
  const next = { ...piece, x: piece.x + dx, y: piece.y + dy };
  if (collides(next)) {
    if (dy > 0) mergePiece();
  } else {
    piece = next;
  }
  drawTetris();
}

function rotateTetris() {
  const next = { ...piece, shape: rotate(piece.shape) };
  if (!collides(next)) piece = next;
  drawTetris();
}

function drawTetris() {
  tctx.fillStyle = "#050816";
  tctx.fillRect(0, 0, tetrisCanvas.width, tetrisCanvas.height);
  tetrisGrid.forEach((row, y) => row.forEach((cell, x) => {
    if (cell) drawTetrisCell(x, y, cell);
  }));
  piece.shape.forEach((row, y) => row.forEach((cell, x) => {
    if (cell) drawTetrisCell(piece.x + x, piece.y + y, piece.color);
  }));
}

function drawTetrisCell(x, y, colorIndex) {
  const colors = ["#67e8f9", "#a78bfa", "#fb7185", "#34d399", "#facc15", "#60a5fa"];
  tctx.fillStyle = colors[(colorIndex - 1) % colors.length];
  tctx.fillRect(x * tetrisSize + 1, y * tetrisSize + 1, tetrisSize - 2, tetrisSize - 2);
}

// Minesweeper
const minesGridEl = document.querySelector("#minesGrid");
let mines;
let minesOpen;
let mineOver;

function startMines() {
  mines = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => ({ mine: false, open: false, flag: false, n: 0 })));
  minesOpen = 0;
  mineOver = false;
  setScore("0 / 71");
  let placed = 0;
  while (placed < 10) {
    const c = randomCell(9, 9);
    if (!mines[c.y][c.x].mine) {
      mines[c.y][c.x].mine = true;
      placed += 1;
    }
  }
  for (let y = 0; y < 9; y += 1) {
    for (let x = 0; x < 9; x += 1) mines[y][x].n = mineNeighbors(x, y);
  }
  renderMines();
}

function mineNeighbors(x, y) {
  let count = 0;
  for (let yy = y - 1; yy <= y + 1; yy += 1) {
    for (let xx = x - 1; xx <= x + 1; xx += 1) {
      if (mines[yy]?.[xx]?.mine) count += 1;
    }
  }
  return count;
}

function openMine(x, y) {
  const cell = mines[y]?.[x];
  if (!cell || cell.open || cell.flag || mineOver) return;
  cell.open = true;
  if (cell.mine) {
    mineOver = true;
    setScore("踩雷");
    mines.flat().forEach((item) => { if (item.mine) item.open = true; });
    renderMines();
    return;
  }
  minesOpen += 1;
  setScore(`${minesOpen} / 71`);
  if (cell.n === 0) {
    for (let yy = y - 1; yy <= y + 1; yy += 1) {
      for (let xx = x - 1; xx <= x + 1; xx += 1) openMine(xx, yy);
    }
  }
  if (minesOpen === 71) setScore("胜利");
  renderMines();
}

function renderMines() {
  minesGridEl.innerHTML = "";
  mines.forEach((row, y) => row.forEach((cell, x) => {
    const button = document.createElement("button");
    button.className = `mine-cell${cell.open ? " open" : ""}${cell.flag ? " flag" : ""}`;
    button.textContent = cell.open ? (cell.mine ? "X" : cell.n || "") : (cell.flag ? "F" : "");
    button.addEventListener("click", () => openMine(x, y));
    button.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      if (!cell.open) cell.flag = !cell.flag;
      renderMines();
    });
    minesGridEl.appendChild(button);
  }));
}

// Memory
const memoryGridEl = document.querySelector("#memoryGrid");
let memoryCards;
let firstCard;
let lockMemory;
let memoryMatches;
let memoryMoves;

function startMemory() {
  const icons = ["★", "◆", "●", "▲", "☀", "☁", "☂", "☕"];
  memoryCards = [...icons, ...icons]
    .sort(() => Math.random() - 0.5)
    .map((icon, index) => ({ icon, index, open: false, matched: false }));
  firstCard = null;
  lockMemory = false;
  memoryMatches = 0;
  memoryMoves = 0;
  setScore(0);
  renderMemory();
}

function flipMemory(card) {
  if (lockMemory || card.open || card.matched) return;
  card.open = true;
  if (!firstCard) {
    firstCard = card;
  } else {
    memoryMoves += 1;
    setScore(memoryMoves);
    if (firstCard.icon === card.icon) {
      firstCard.matched = true;
      card.matched = true;
      firstCard = null;
      memoryMatches += 1;
      if (memoryMatches === 8) setScore(`胜利 ${memoryMoves}`);
    } else {
      lockMemory = true;
      setTimeout(() => {
        firstCard.open = false;
        card.open = false;
        firstCard = null;
        lockMemory = false;
        renderMemory();
      }, 650);
    }
  }
  renderMemory();
}

function renderMemory() {
  memoryGridEl.innerHTML = "";
  memoryCards.forEach((card) => {
    const button = document.createElement("button");
    button.className = `memory-card${card.open ? " open" : ""}${card.matched ? " matched" : ""}`;
    button.textContent = card.open || card.matched ? card.icon : "?";
    button.addEventListener("click", () => flipMemory(card));
    memoryGridEl.appendChild(button);
  });
}

// 2048
const tilesEl = document.querySelector("#tiles");
let grid2048;
let score2048;

function start2048() {
  grid2048 = Array.from({ length: 4 }, () => Array(4).fill(0));
  score2048 = 0;
  addTile();
  addTile();
  setScore(0);
  render2048();
}

function addTile() {
  const empty = [];
  grid2048.forEach((row, y) => row.forEach((value, x) => {
    if (!value) empty.push({ x, y });
  }));
  if (!empty.length) return;
  const spot = empty[Math.floor(Math.random() * empty.length)];
  grid2048[spot.y][spot.x] = Math.random() < 0.9 ? 2 : 4;
}

function slideRow(row) {
  const values = row.filter(Boolean);
  for (let i = 0; i < values.length - 1; i += 1) {
    if (values[i] === values[i + 1]) {
      values[i] *= 2;
      score2048 += values[i];
      values.splice(i + 1, 1);
    }
  }
  while (values.length < 4) values.push(0);
  return values;
}

function move2048(dir) {
  const before = JSON.stringify(grid2048);
  if (dir === "left") grid2048 = grid2048.map(slideRow);
  if (dir === "right") grid2048 = grid2048.map((row) => slideRow([...row].reverse()).reverse());
  if (dir === "up" || dir === "down") {
    const columns = [0, 1, 2, 3].map((x) => grid2048.map((row) => row[x]));
    const moved = columns.map((col) => dir === "up" ? slideRow(col) : slideRow(col.reverse()).reverse());
    grid2048 = [0, 1, 2, 3].map((y) => [0, 1, 2, 3].map((x) => moved[x][y]));
  }
  if (before !== JSON.stringify(grid2048)) addTile();
  setScore(score2048);
  render2048();
}

function render2048() {
  tilesEl.innerHTML = "";
  grid2048.flat().forEach((value) => {
    const tile = document.createElement("div");
    tile.className = value ? "tile" : "tile empty";
    tile.textContent = value || "";
    if (value) tile.style.background = `hsl(${Math.max(32, 210 - Math.log2(value) * 18)} 85% 72%)`;
    tilesEl.appendChild(tile);
  });
}

// Breakout
const breakoutCanvas = document.querySelector("#breakoutCanvas");
const bctx = breakoutCanvas.getContext("2d");
let ball;
let paddle;
let bricks;
let breakoutScore;
let leftPressed = false;
let rightPressed = false;

function startBreakout() {
  breakoutScore = 0;
  setScore(0);
  ball = { x: 260, y: 260, dx: 3, dy: -3, r: 8 };
  paddle = { x: 210, y: 326, w: 100, h: 12 };
  bricks = [];
  for (let y = 0; y < 5; y += 1) {
    for (let x = 0; x < 8; x += 1) bricks.push({ x: 24 + x * 60, y: 28 + y * 28, w: 48, h: 16, alive: true });
  }
  breakoutFrame = requestAnimationFrame(tickBreakout);
}

function tickBreakout() {
  if (rightPressed) paddle.x += 6;
  if (leftPressed) paddle.x -= 6;
  paddle.x = Math.max(0, Math.min(breakoutCanvas.width - paddle.w, paddle.x));
  ball.x += ball.dx;
  ball.y += ball.dy;
  if (ball.x < ball.r || ball.x > breakoutCanvas.width - ball.r) ball.dx *= -1;
  if (ball.y < ball.r) ball.dy *= -1;
  if (ball.y > breakoutCanvas.height) {
    restartActiveGame();
    return;
  }
  if (ball.y + ball.r > paddle.y && ball.x > paddle.x && ball.x < paddle.x + paddle.w) ball.dy = -Math.abs(ball.dy);
  bricks.forEach((brick) => {
    if (!brick.alive) return;
    const hit = ball.x > brick.x && ball.x < brick.x + brick.w && ball.y > brick.y && ball.y < brick.y + brick.h;
    if (hit) {
      brick.alive = false;
      ball.dy *= -1;
      breakoutScore += 5;
      setScore(breakoutScore);
    }
  });
  if (bricks.every((brick) => !brick.alive)) restartActiveGame();
  drawBreakout();
  breakoutFrame = requestAnimationFrame(tickBreakout);
}

function drawBreakout() {
  bctx.fillStyle = "#050816";
  bctx.fillRect(0, 0, breakoutCanvas.width, breakoutCanvas.height);
  bricks.forEach((brick, index) => {
    if (!brick.alive) return;
    bctx.fillStyle = ["#67e8f9", "#a78bfa", "#fb7185", "#34d399"][index % 4];
    bctx.fillRect(brick.x, brick.y, brick.w, brick.h);
  });
  bctx.fillStyle = "#dbeafe";
  bctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
  bctx.beginPath();
  bctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  bctx.fillStyle = "#facc15";
  bctx.fill();
}

breakoutCanvas.addEventListener("pointermove", (event) => {
  const rect = breakoutCanvas.getBoundingClientRect();
  const scale = breakoutCanvas.width / rect.width;
  paddle.x = (event.clientX - rect.left) * scale - paddle.w / 2;
});

document.querySelectorAll("[data-dir]").forEach((button) => {
  button.addEventListener("click", () => handleDirection(button.dataset.dir));
});

function handleDirection(dir) {
  if (activeGame === "snake") setSnakeDirection(dir);
  if (activeGame === "tile2048") move2048(dir);
  if (activeGame === "tetris") {
    if (dir === "left") moveTetris(-1, 0);
    if (dir === "right") moveTetris(1, 0);
    if (dir === "down") moveTetris(0, 1);
    if (dir === "up") rotateTetris();
  }
  if (activeGame === "breakout") {
    if (dir === "left") paddle.x -= 28;
    if (dir === "right") paddle.x += 28;
  }
}

document.addEventListener("keydown", (event) => {
  const keyMap = {
    ArrowUp: "up", w: "up", W: "up",
    ArrowDown: "down", s: "down", S: "down",
    ArrowLeft: "left", a: "left", A: "left",
    ArrowRight: "right", d: "right", D: "right",
  };
  const dir = keyMap[event.key];
  if (!dir) return;
  event.preventDefault();
  if (activeGame === "breakout") {
    leftPressed = dir === "left";
    rightPressed = dir === "right";
  }
  handleDirection(dir);
});

document.addEventListener("keyup", () => {
  leftPressed = false;
  rightPressed = false;
});

startSnake();
