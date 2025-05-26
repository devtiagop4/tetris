// Sons do jogo
const sounds = {
    move: new Audio('./assets/move.wav'),
   rotate: new Audio('./assets/rotate.wav'),
    drop: new Audio('./assets/lin.wav'),
    line: new Audio('./assets/lugarline1.wav'),
    gameover: new Audio('./assets/lugargameover.wav'),
    background: new Audio('./assets/fundo1.mp3') // Música de fundo
};

sounds.background.loop = true;
sounds.background.volume = 0.08;
sounds.move.volume = 0.02;
sounds.rotate.volume = 0.03;

// Canvas principal
const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
context.scale(20, 20);

// Canvas da próxima peça
const nextPieceCanvas = document.getElementById('next-piece');
const nextPieceContext = nextPieceCanvas.getContext('2d');
nextPieceContext.scale(12, 12);

// Variáveis de controle
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let score = 0;
let level = 0;
let isGameOver = false;
let isPaused = false;
let gameStarted = false;

// Cores
const colors = [null, '#ccc', '#ccc', '#ccc', '#ccc', '#ccc', '#ccc', '#ccc', '#ccc', '#ccc', '#ccc', '#ccc', '#ccc'];

// Arena
const arena = createMatrix(12, 20);

// Jogador
const player = {
    pos: { x: 0, y: 0 },
    matrix: null,
    score: 0
};

// Próxima peça
let nextPiece = createPiece(randomType());

function createMatrix(w, h) {
    const matrix = [];
    while (h--) matrix.push(new Array(w).fill(0));
    return matrix;
}

function randomType() {
    return 'TJLOSZI*#'[Math.floor(Math.random() * 9)];
}

function createPiece(type) {
    const pieces = {
        T: [[0, 0, 0], [1, 1, 1], [0, 1, 0]],
        //X: [[0, 1, 0], [1, 1, 1], [0, 1, 0]],
      //  W: [[0, 0, 1], [1, 1, 1], [0, 0, 1]],
       // E: [[1, 0, 1], [1, 1, 1], [0, 0, 0]],
        O: [[2, 2], [2, 2]],
        L: [[0, 3, 0], [0, 3, 0], [0, 3, 3]],
        J: [[0, 4, 0], [0, 4, 0], [4, 4, 0]],
        I: [[0, 5, 0, 0], [0, 5, 0, 0], [0, 5, 0, 0], [0, 5, 0, 0]],
        S: [[0, 6, 6], [6, 6, 0], [0, 0, 0]],
        Z: [[7, 7, 0], [0, 7, 7], [0, 0, 0]],
        '*': [[7]],
        '#': [[7], [7]]
    };
    return pieces[type];
}

function drawMatrix(matrix, offset, ctx = context) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                ctx.fillStyle = colors[value];
                ctx.fillRect(x + offset.x, y + offset.y, 1, 1);
                ctx.strokeStyle = '#000020';
                ctx.lineWidth = 0.03;
                ctx.strokeRect(x + offset.x, y + offset.y, 1, 1);
            }
        });
    });
}

function draw() {
    context.fillStyle = '#000';
    context.fillRect(0, 0, canvas.width, canvas.height);
    drawMatrix(arena, { x: 0, y: 0 });
    drawMatrix(player.matrix, player.pos);
    drawNextPiece();
}

function drawNextPiece() {
    nextPieceContext.fillStyle = '#000';
    nextPieceContext.fillRect(0, 0, nextPieceCanvas.width, nextPieceCanvas.height);
    drawMatrix(nextPiece, { x: 1, y: 1 }, nextPieceContext);
}

function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                arena[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

function collide(arena, player) {
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 && (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

function playerDrop() {
    if (isGameOver || isPaused) return;
    player.pos.y++;
    if (collide(arena, player)) {
        player.pos.y--;
        merge(arena, player);
        playerReset();
        arenaSweep();
        updateScore();
    }
    dropCounter = 0;
}

function arenaSweep() {
    let rowCount = 1;
    outer: for (let y = arena.length - 1; y >= 0; --y) {
        for (let x = 0; x < arena[y].length; ++x) {
            if (arena[y][x] === 0) continue outer;
        }
        arena.splice(y, 1);
        arena.unshift(new Array(arena[0].length).fill(0));
        ++y;
        score += rowCount * 1000;
        rowCount *= 2;
        level = Math.floor(score / 10000) + 1;
        dropInterval = Math.max(800 - level * 100, 100);
        sounds.line.play();
    }
}

function playerMove(dir) {
    if (isGameOver || isPaused) return;
    player.pos.x += dir;
    if (collide(arena, player)) player.pos.x -= dir;
    else sounds.move.play();
}

function playerReset() {
    player.matrix = nextPiece;
    nextPiece = createPiece(randomType());
    player.pos.y = 0;
    player.pos.x = (arena[0].length / 2 | 0) - (player.matrix[0].length / 2 | 0);
    if (collide(arena, player)) gameOver();
}

function gameOver() {
    isGameOver = true;
    sounds.gameover.play();
    sounds.background.pause();
    const best = localStorage.getItem('tetrisRecord') || 0;
    if (score > best) localStorage.setItem('tetrisRecord', score);
    document.getElementById('record').innerText = localStorage.getItem('tetrisRecord');
    document.getElementById('game-over').style.display = 'block';
}

function playerRotateWrapper() {
    if (isGameOver || isPaused) return;
    player.matrix = playerRotate(player.matrix);
    if (collide(arena, player)) {
        for (let i = 0; i < 3; i++) player.matrix = playerRotate(player.matrix);
    } else {
        sounds.rotate.play();
    }
}

function playerRotate(matrix) {
    const result = [];
    for (let y = 0; y < matrix[0].length; y++) {
        result[y] = [];
        for (let x = matrix.length - 1; x >= 0; x--) {
            result[y].push(matrix[x][y]);
        }
    }
    return result;
}

// Prevenir scroll ao usar teclas de seta e espaço
window.addEventListener('keydown', e => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
    }

    if (isGameOver) return;

    if (e.key === 'ArrowLeft') playerMove(-1);
    else if (e.key === 'ArrowRight') playerMove(1);
    else if (e.key === 'ArrowDown') playerDrop();
    else if (e.key === ' ' && !isPaused) playerRotateWrapper(); // Só rotaciona se não estiver pausado
});

function setupTouchControls() {
    const controls = document.createElement('div');
    controls.className = 'touch-controls';
    controls.innerHTML = `
        <button id="left">◀</button>
        <button id="down">▼</button>
        <button id="right">▶</button>
        <button id="rotate">⟳</button>
    `;
    document.body.appendChild(controls);
    document.getElementById('left').onclick = () => playerMove(-1);
    document.getElementById('right').onclick = () => playerMove(1);
    document.getElementById('down').onclick = () => playerDrop();
    document.getElementById('rotate').onclick = () => playerRotateWrapper();
}

document.getElementById('restart').addEventListener('click', () => {
    isGameOver = false;
    score = 0;
    level = 0;
    dropInterval = 1000;
    arena.forEach(row => row.fill(0));
    document.getElementById('game-over').style.display = 'none';
    playerReset();
    updateScore();
    if (!gameStarted) {
        sounds.background.play();
        gameStarted = true;
    }
});

document.getElementById('pause').addEventListener('click', () => {
    isPaused = !isPaused;
    document.getElementById('pause').innerText = isPaused ? 'Continue' : 'Pause';
});

function update(time = 0) {
    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;

    if (!isGameOver && !isPaused && dropCounter > dropInterval) {
        playerDrop();
    }

    draw();
    requestAnimationFrame(update);
}

function updateScore() {
    document.getElementById('score').innerText = score;
    document.getElementById('level').innerText = level;
    document.getElementById('record').innerText = localStorage.getItem('tetrisRecord') || 0;
}

playerReset();
updateScore();
setupTouchControls();
update();