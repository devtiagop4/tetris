// Sons do jogo para diferentes ações
const sounds = {
    move: new Audio('./assets/move.wav'),      // Som de movimento
    rotate: new Audio('./assets/rotate.wav'),  // Som de rotação
    drop: new Audio('../assets/lin.wav'),      // Som de queda rápida
    line: new Audio('./assets/line1.wav'),     // Som ao completar linha
    gameover: new Audio('./assets/gameover.wav') // Som de fim de jogo
};

// Canvas principal do jogo
const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
// Escala para desenhar peças maiores
context.scale(20, 20);

// Canvas para a próxima peça
const nextPieceCanvas = document.getElementById('next-piece');
const nextPieceContext = nextPieceCanvas.getContext('2d');
nextPieceContext.scale(14, 14);

// Variáveis de controle do jogo
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let score = 0;
let level = 0;
let isGameOver = false;
let isPaused = false;

// Cores correspondentes às peças
const colors = [null, '#ccc', '#ccc', '#ccc', '#ccc', '#ccc', '#ccc', '#ccc', '#ccc', '#ccc', '#ccc', '#ccc', '#ccc',];

// Matriz que representa o campo de jogo (arena)
const arena = createMatrix(12, 20);

// Objeto do jogador
const player = {
    pos: { x: 0, y: 0 },
    matrix: null,
    score: 0
};

// Próxima peça
let nextPiece = createPiece(randomType());

/**
 * Cria uma matriz com largura (w) e altura (h) preenchida com zeros
 */
function createMatrix(w, h) {
    const matrix = [];
    while (h--) matrix.push(new Array(w).fill(0));
    return matrix;
}

/**
 * Retorna um tipo aleatório de peça (T, J, L, O, S, Z, I, *, #, X, W, E)
 */
function randomType() {
    return 'TJLOSZI*#XWE'[Math.floor(Math.random() * 12)];
}

/**
 * Cria a matriz da peça com base no tipo recebido
 */
function createPiece(type) {
    if (type === 'T') return [[0, 0, 0], [1, 1, 1], [0, 1, 0]];
    if (type === 'X') return [[0, 1, 0], [1, 1, 1], [0, 1, 0]];
    if (type === 'W') return [[0, 0, 1], [1, 1, 1], [0, 0, 1]];
    if (type === 'E') return [[1, 0, 1], [1, 1, 1], [0, 0, 0]]; // 
    if (type === 'O') return [[2, 2], [2, 2]];
    if (type === 'L') return [[0, 3, 0], [0, 3, 0], [0, 3, 3]];
    if (type === 'J') return [[0, 4, 0], [0, 4, 0], [4, 4, 0]];
    if (type === 'I') return [[0, 5, 0, 0], [0, 5, 0, 0], [0, 5, 0, 0], [0, 5, 0, 0]];
    if (type === 'S') return [[0, 6, 6], [6, 6, 0], [0, 0, 0]];
    if (type === 'Z') return [[7, 7, 0], [0, 7, 7], [0, 0, 0]];
    if (type === '*') return [[7]];
    if (type === '#') return [[7], [7]];
}

/**
 * Desenha uma matriz no canvas (arena ou peça do jogador)
 */
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

/**
 * Desenha a arena e a peça atual
 */
function draw() {
    context.fillStyle = '#000';
    context.fillRect(0, 0, canvas.width, canvas.height);
    drawMatrix(arena, { x: 0, y: 0 });
    drawMatrix(player.matrix, player.pos);
    drawNextPiece();
}

/**
 * Mostra a próxima peça no mini canvas
 */
function drawNextPiece() {
    nextPieceContext.fillStyle = '#000';
    nextPieceContext.fillRect(0, 0, nextPieceCanvas.width, nextPieceCanvas.height);
    drawMatrix(nextPiece, { x: 1, y: 1 }, nextPieceContext);
}

/**
 * Mescla a peça atual na arena quando ela para de cair
 */
function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                arena[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

/**
 * Verifica colisão entre peça atual e arena
 */
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

/**
 * Move a peça para baixo, verifica colisão, mescla e reinicia
 */
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

/**
 * Verifica e remove linhas completas
 */
function arenaSweep() {
    let rowCount = 1;
    outer: for (let y = arena.length - 1; y >= 0; --y) {
        for (let x = 0; x < arena[y].length; ++x) {
            if (arena[y][x] === 0) continue outer;
        }
        const row = arena.splice(y, 1)[0].fill(0);
        arena.unshift(row);
        ++y;

        sounds.line.play();
        score += rowCount * 100;
        rowCount *= 2;

        level = Math.floor(score / 1000) + 1;
        dropInterval = Math.max(800 - level * 100, 100);
    }
}

/**
 * Move a peça na horizontal
 */
function playerMove(dir) {
    if (isGameOver || isPaused) return;
    player.pos.x += dir;
    if (collide(arena, player)) {
        player.pos.x -= dir;
    } else {
        sounds.move.play();
    }
}

/**
 * Reinicia o jogador com a próxima peça
 */
function playerReset() {
    player.matrix = nextPiece;
    nextPiece = createPiece(randomType());
    player.pos.y = 0;
    player.pos.x = (arena[0].length / 2 | 0) - (player.matrix[0].length / 2 | 0);
    if (collide(arena, player)) {
        gameOver();
    }
}

/**
 * Finaliza o jogo
 */
function gameOver() {
    isGameOver = true;
    sounds.gameover.play();
    const best = localStorage.getItem('tetrisRecord') || 0;
    if (score > best) localStorage.setItem('tetrisRecord', score);
    document.getElementById('record').innerText = localStorage.getItem('tetrisRecord');
    document.getElementById('game-over').style.display = 'block';
}

/**
 * Gira a peça e desfaz se colidir
 */
function playerRotateWrapper() {
    if (isGameOver || isPaused) return;
    player.matrix = playerRotate(player.matrix);
    if (collide(arena, player)) {
        for (let i = 0; i < 3; i++) player.matrix = playerRotate(player.matrix);
    } else {
        sounds.rotate.play();
    }
}

/**
 * Gira a matriz da peça no sentido horário
 */
function playerRotate(matrix) {
    const newMatrix = [];
    for (let y = 0; y < matrix[0].length; y++) {
        newMatrix[y] = [];
        for (let x = matrix.length - 1; x >= 0; x--) {
            newMatrix[y].push(matrix[x][y]);
        }
    }
    return newMatrix;
}

// Controles por teclado
document.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') playerMove(-1);
    else if (event.key === 'ArrowRight') playerMove(1);
    else if (event.key === 'ArrowDown') playerDrop();
    else if (event.key === ' ') playerRotateWrapper();
});

/**
 * Controles de toque para dispositivos móveis
 */
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

// Reiniciar jogo
document.getElementById('restart').addEventListener('click', () => {
    isGameOver = false;
    score = 0;
    level = 0;
    dropInterval = 1000;
    arena.forEach(row => row.fill(0));
    document.getElementById('game-over').style.display = 'none';
    playerReset();
    updateScore();
});

// Pausar ou continuar
document.getElementById('pause').addEventListener('click', () => {
    isPaused = !isPaused;
    document.getElementById('pause').innerText = isPaused ? 'Continue' : 'Pause';
});

/**
 * Função principal que atualiza o estado do jogo continuamente
 */
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

/**
 * Atualiza pontuação, nível e recorde
 */
function updateScore() {
    document.getElementById('score').innerText = score;
    document.getElementById('level').innerText = level;
    document.getElementById('record').innerText = localStorage.getItem('tetrisRecord') || 0;
}

// Inicializa o jogo
playerReset();
updateScore();
setupTouchControls();
update();