
const grid = document.getElementById('grid');
// core palette (visible and selectable)
const baseColors = ['red', 'blue', 'green', 'magenta', 'orange'];
// extra colors that increase difficulty
const extraColors = ['#39FF14', '#00BFFF', '#FF0080', '#000000'];
// all possible colors; placeSolvablePairs will pick from these based on difficulty
const colors = baseColors.concat(extraColors);
const size = 10;

let cells = [];
let selectedColor = null;
let winCount = 0;
let resetCount = 0;
let gameWon = false;
let isMouseDown = false;

// Colourblind mode: when true emojis are shown, when false emojis are hidden
let colourblindMode = false;

// Difficulty and streak
let difficultyLevel = 1; // starts easy
const MAX_DIFFICULTY = 8;
let winStreak = 0;
// Game mode: 'highscore' or 'timed'
let gameMode = 'highscore';
let timerInterval = null;
let elapsedSeconds = 0;
let timedDuration = 1; // minutes selected in settings
let timerExpired = false;

// leaderboard stored as {"1": [secsRemaining,...], "2": [...], ...}
const LEADERBOARD_KEY = 'linegame_leaderboard_v1';
function loadLeaderboard(){ try{ const raw = localStorage.getItem(LEADERBOARD_KEY); return raw ? JSON.parse(raw) : {}; }catch(e){ return {}; } }
function saveLeaderboard(lb){ try{ localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(lb)); }catch(e){} }
let leaderboard = loadLeaderboard();
// Language support (simple static translations)
let currentLang = 'en';
const TRANSLATIONS = {
  en: {
    startTitle: 'Connect Line Game', startBtn: 'Start', settingsBtn: 'Settings', modeBtn: 'Game Mode',
    settingsClose: 'Close', gamemodeClose: 'Close', scoreboardClose:'Close', checkWin: 'Check Win', resetBtn: 'Reset',
    winsLabel: 'Wins', resetsLabel: 'Resets', streakLabel: 'Streak', difficultyLabel: 'Difficulty',
    scoreboardTitle: 'Scoreboard', exitBtn: 'Exit', colorblindLabel: 'Colourblind friendly mode',
    highscoreLabel: 'Highscore mode', timedLabel: 'Timed mode', timedDurationLabel: 'Timed duration:',
    solvedLabel: 'Solved', statusWin: 'You Win!', statusNotWin: 'Not won yet – check your connections.'
  },
  da: {
    startTitle: 'Forbind Linje Spil', startBtn: 'Start', settingsBtn: 'Indstillinger', modeBtn: 'Spiltilstand',
    settingsClose: 'Luk', gamemodeClose: 'Luk', scoreboardClose:'Luk', checkWin: 'Tjek vind', resetBtn: 'Nulstil',
    winsLabel: 'Vundne', resetsLabel: 'Nulstillinger', streakLabel: 'Serie', difficultyLabel: 'Sværhedsgrad',
    scoreboardTitle: 'Highscore', exitBtn: 'Afslut', colorblindLabel: 'Farveblind venlig',
    highscoreLabel: 'Highscore-tilstand', timedLabel: 'Tidstilstand', timedDurationLabel: 'Tid:',
    solvedLabel: 'Løst', statusWin: 'Du vandt!', statusNotWin: 'Ikke vundet endnu – tjek dine forbindelser.'
  },
  de: {
    startTitle: 'Verbinde Linien Spiel', startBtn: 'Start', settingsBtn: 'Einstellungen', modeBtn: 'Spielmodus',
    settingsClose: 'Schließen', gamemodeClose: 'Schließen', scoreboardClose:'Schließen', checkWin: 'Prüfe Sieg', resetBtn: 'Zurücksetzen',
    winsLabel: 'Siege', resetsLabel: 'Zurücksetzungen', streakLabel: 'Serie', difficultyLabel: 'Schwierigkeit',
    scoreboardTitle: 'Bestenliste', exitBtn: 'Beenden', colorblindLabel: 'Farbenblind-Modus',
    highscoreLabel: 'Highscore-Modus', timedLabel: 'Zeitmodus', timedDurationLabel: 'Zeitdauer:',
    solvedLabel: 'Gelöst', statusWin: 'Gewonnen!', statusNotWin: 'Noch nicht gewonnen – prüfe deine Verbindungen.'
  }
};

// Apply translations for UI elements
function applyLanguage(lang){
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  currentLang = lang;
  try { localStorage.setItem('language', lang); } catch(e){}
  const startTitle = document.getElementById('start-title'); if (startTitle) startTitle.textContent = t.startTitle;
  try { document.title = t.startTitle; } catch(e){}
  const startBtn = document.getElementById('start-btn'); if (startBtn) startBtn.textContent = t.startBtn;
  const settingsBtn = document.getElementById('settings-btn'); if (settingsBtn) settingsBtn.textContent = t.settingsBtn;
  const modeBtn = document.getElementById('mode-btn'); if (modeBtn) modeBtn.textContent = t.modeBtn;
  const settingsClose = document.getElementById('settings-close'); if (settingsClose) settingsClose.textContent = t.settingsClose;
  const gamemodeClose = document.getElementById('gamemode-close'); if (gamemodeClose) gamemodeClose.textContent = t.gamemodeClose;
  const scoreboardClose = document.getElementById('scoreboard-close'); if (scoreboardClose) scoreboardClose.textContent = t.scoreboardClose;
  const checkWin = document.getElementById('check-win'); if (checkWin) checkWin.textContent = t.checkWin;
  const resetBtn = document.getElementById('reset-btn'); if (resetBtn) resetBtn.textContent = t.resetBtn;
  const exitBtn = document.getElementById('exit-to-start'); if (exitBtn) exitBtn.textContent = t.exitBtn;
  const cbLabel = document.querySelector('label[for="colourblind-toggle"]'); if (cbLabel) cbLabel.textContent = t.colorblindLabel;
  // update mode labels
  setLabelTextForInput('game-mode', 'highscore', t.highscoreLabel);
  setLabelTextForInput('game-mode', 'timed', t.timedLabel);
  // update timed duration label (title above durations)
  const durTitle = document.querySelector('#gamemode-modal .duration-select'); if (durTitle){
    const parent = durTitle.parentElement; const label = parent.querySelector('label'); if (label) label.textContent = t.timedDurationLabel;
  }
  // update scoreboard title
  const sbTitle = document.querySelector('#scoreboard-body h2'); if (sbTitle) sbTitle.textContent = t.scoreboardTitle;
  // update sidebar counters text
  const counters = Array.from(document.querySelectorAll('.sidebar .counter'));
  if (counters[0]) counters[0].innerHTML = `${t.winsLabel}: <span id="win-count">${winCount}</span>`;
  if (counters[1]) counters[1].innerHTML = `${t.resetsLabel}: <span id="reset-count">${resetCount}</span>`;
  if (counters[2]) counters[2].innerHTML = `${t.streakLabel}: <span id="win-streak">${winStreak}</span>`;
  if (counters[3]) counters[3].innerHTML = `${t.difficultyLabel}: <span id="difficulty-level">${difficultyLevel}</span>`;
  // status messages - don't override current unless status is a default message
  const status = document.getElementById('status'); if (status) {
    if (status.className === 'win') status.textContent = t.statusWin;
    else if (status.className === 'error') status.textContent = t.statusNotWin;
  }
}

// helper to update label text while keeping radio input in place
function setLabelTextForInput(name, value, text){
  const input = document.querySelector(`input[name="${name}"][value="${value}"]`);
  if (!input) return;
  const label = input.parentElement;
  // reassemble label so it keeps the input
  label.innerHTML = '';
  label.appendChild(input);
  label.appendChild(document.createTextNode(' ' + text));
}

// don't init until player presses Start; start screen handles initialization

// Reset-knap
document.getElementById('reset-btn').addEventListener('click', () => {
  if (!gameWon) {
    resetCount++;
    document.getElementById('reset-count').textContent = resetCount;
    // player gave up / failed to connect -> penalize: reduce difficulty by 4 levels and reset streak
    difficultyLevel = Math.max(1, difficultyLevel - 4);
    winStreak = 0;
    document.getElementById('difficulty-level').textContent = difficultyLevel;
    document.getElementById('win-streak').textContent = winStreak;
  }
  initGame();
});

// Emoji candidates to choose from when assigning to colors
const emojiPool = ['🔴','🔵','🟢','🟣','🟠','💚','🔷','💗','🎱','🌵','🎄','⭐','🔶','⚫','🍀','🍉'];

// utility: shuffle array in place
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Return an emoji for a given color. Fixed mappings for dark green and neon green
function getEmojiForColor(color, pool) {
  const fixed = {
    'red': '🔴', 'blue': '🔵', 'green': '🎄', 'magenta': '🟣', 'orange': '🟠',
    '#39FF14': '🌵', '#00BFFF': '🔷', '#FF0080': '💗', '#000000': '🎱'
  };
  if (fixed[color]) return fixed[color];
  if (pool && pool.length) return pool.pop();
  return emojiPool[0] || '';
}

// Update visible emoji text in palette buttons and grid cells according to `colourblindMode`
function updateAllEmojis() {
  document.querySelectorAll('#color-palette button').forEach(btn => {
    const c = btn.dataset.color;
    if (!c) { btn.textContent = ''; return; }
    btn.textContent = colourblindMode ? getEmojiForColor(c) : '';
  });

  cells.forEach(cell => {
    const c = cell.dataset.color;
    if (!c) { cell.textContent = ''; return; }
    cell.textContent = colourblindMode ? getEmojiForColor(c) : '';
  });
}

// assign colors+emoji to palette buttons (randomize when requested)
function setupPalette(randomize = false) {
  const btns = Array.from(document.querySelectorAll('#color-palette button'));
  // Assign colors to palette buttons in a fixed order so each color stays in the same spot.
  // The palette shows baseColors first, then extraColors.
  const allColors = baseColors.concat(extraColors);
  let colorValues = allColors.slice(0, btns.length);

  // prepare emojis to assign. copy emojiPool and shuffle
  let emojis = shuffle(emojiPool.slice());

  // Now assign to buttons (use fixed emoji map for specific colors)
  btns.forEach((btn, idx) => {
    const color = colorValues[idx];
    const emoji = getEmojiForColor(color, emojis);
    btn.dataset.color = color;
    btn.style.background = color;
    btn.textContent = colourblindMode ? emoji : '';
    btn.setAttribute('aria-pressed', 'false');
    btn.removeAttribute('aria-hidden');
    btn.onclick = () => {
      selectedColor = btn.dataset.color;
      document.querySelectorAll('#color-palette button').forEach(b => b.setAttribute('aria-pressed', 'false'));
      btn.setAttribute('aria-pressed', 'true');
    };
  });
}

// Start button: hide start screen and initialize the game
const startBtn = document.getElementById('start-btn');
if (startBtn) {
  startBtn.addEventListener('click', () => {
    const startScreen = document.getElementById('start-screen');
    // randomize palette on start and hide start screen
    setupPalette(true);
    // ensure palette and cells reflect current colourblind setting
    updateAllEmojis();
    if (startScreen) startScreen.style.display = 'none';
    // show exit button during gameplay
    const exitBtn = document.getElementById('exit-to-start');
    if (exitBtn) { exitBtn.classList.remove('hidden'); exitBtn.classList.add('exit-button'); }
    // determine game mode from settings
    const sel = document.querySelector('input[name="game-mode"]:checked');
    gameMode = sel ? sel.value : 'highscore';
    // determine timed duration from settings (if applicable)
    const durEl = document.querySelector('input[name="timed-duration"]:checked');
    timedDuration = durEl ? parseInt(durEl.value, 10) : 1;
    // countdown timer behavior for Timed mode
    const timerEl = document.getElementById('timer');
    if (timerEl) {
      if (gameMode === 'timed') {
        timerExpired = false;
        let remaining = timedDuration * 60;
        timerEl.classList.remove('hidden');
        timerEl.textContent = (String(Math.floor(remaining/60)).padStart(2,'0') + ':' + String(remaining%60).padStart(2,'0'));
        timerEl.dataset.remaining = String(remaining);
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(() => {
          remaining--;
          timerEl.dataset.remaining = String(Math.max(0, remaining));
          if (remaining < 0) {
            clearInterval(timerInterval); timerInterval = null; timerExpired = true;
            timerEl.textContent = '00:00';
            onTimerEnd(timedDuration);
            return;
          }
          timerEl.textContent = (String(Math.floor(remaining/60)).padStart(2,'0') + ':' + String(remaining%60).padStart(2,'0'));
        }, 1000);
      } else {
        // hide timer in highscore mode
        timerEl.classList.add('hidden');
        if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
      }
    }
    initGame();
  });
}

// Settings button opens settings modal; modal starts hidden
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const settingsClose = document.getElementById('settings-close');
if (settingsModal) settingsModal.classList.add('modal-hidden');

if (settingsBtn && settingsModal) {
  settingsBtn.addEventListener('click', () => {
    // hide the start screen and show the fullscreen settings modal
    const startScreen = document.getElementById('start-screen');
    if (startScreen) startScreen.style.display = 'none';
    settingsModal.classList.remove('modal-hidden');
  });
}

// Game mode button + modal
const modeBtn = document.getElementById('mode-btn');
const gamemodeModal = document.getElementById('gamemode-modal');
const gamemodeClose = document.getElementById('gamemode-close');
if (gamemodeModal) gamemodeModal.classList.add('modal-hidden');
if (modeBtn && gamemodeModal) {
  modeBtn.addEventListener('click', () => {
    const startScreen = document.getElementById('start-screen'); if (startScreen) startScreen.style.display = 'none';
    gamemodeModal.classList.remove('modal-hidden');
  });
}
if (gamemodeClose && gamemodeModal) {
  gamemodeClose.addEventListener('click', () => {
    gamemodeModal.classList.add('modal-hidden');
    const startScreen = document.getElementById('start-screen'); if (startScreen) startScreen.style.display = 'flex';
  });
}

if (settingsClose && settingsModal) {
  settingsClose.addEventListener('click', () => {
    // close settings and return to the start screen
    settingsModal.classList.add('modal-hidden');
    const startScreen = document.getElementById('start-screen');
    if (startScreen) startScreen.style.display = 'flex';
  });
}

// close modal when clicking outside modal-box (also returns to start screen)
if (settingsModal) {
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      settingsModal.classList.add('modal-hidden');
      const startScreen = document.getElementById('start-screen');
      if (startScreen) startScreen.style.display = 'flex';
    }
  });
}

// initial palette setup (non-random until player starts)
setupPalette(false);

// Wire the colourblind checkbox to toggle emojis on/off
const cb = document.getElementById('colourblind-toggle');
if (cb) {
  // initialize from checkbox (checkbox default is unchecked in HTML)
  colourblindMode = cb.checked;
  cb.addEventListener('change', () => {
    colourblindMode = cb.checked;
    updateAllEmojis();
  });
}

// Language selector handling
const langRadios = Array.from(document.querySelectorAll('input[name="language"]'));
langRadios.forEach(r => r.addEventListener('change', (e)=>{
  applyLanguage(e.target.value);
}));

// Initialize language from localStorage
const savedLang = localStorage.getItem('language');
if (savedLang) {
  const node = document.querySelector(`input[name="language"][value="${savedLang}"]`);
  if (node) node.checked = true;
  applyLanguage(savedLang);
} else {
  applyLanguage('en');
}

// (removed duplicate Exit button listener — settings modal uses Close button)

// Exit-to-start button visible during gameplay
const exitToStart = document.getElementById('exit-to-start');
if (exitToStart) {
  exitToStart.addEventListener('click', () => {
    // hide game UI and show start screen
    const startScreen = document.getElementById('start-screen');
    if (startScreen) startScreen.style.display = 'flex';
    // hide exit button
    exitToStart.classList.add('hidden');
    // clear grid (reset state)
    grid.innerHTML = '';
    // stop timer if running
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    const timerEl = document.getElementById('timer'); if (timerEl) timerEl.textContent = '00:00';
    // Reset scores and difficulty entirely
    winCount = 0;
    resetCount = 0;
    winStreak = 0;
    difficultyLevel = 1;
    // Reset UI counters
    const winEl = document.getElementById('win-count'); if (winEl) winEl.textContent = winCount;
    const resetEl = document.getElementById('reset-count'); if (resetEl) resetEl.textContent = resetCount;
    const streakEl = document.getElementById('win-streak'); if (streakEl) streakEl.textContent = winStreak;
    const diffEl = document.getElementById('difficulty-level'); if (diffEl) diffEl.textContent = difficultyLevel;
    // Clear any status text and state
    document.getElementById('status').textContent = '';
    gameWon = false;
    timerExpired = false;
    timerExpired = false;
  });
}

function initGame() {
  grid.innerHTML = '';
  cells = [];
  gameWon = false;
  selectedColor = null;
  document.getElementById('status').textContent = "";
  document.querySelectorAll('#color-palette button').forEach(b => b.setAttribute('aria-pressed', 'false'));

  // randomize palette each level so colors/buttons change per round
  setupPalette(false);
  updateAllEmojis();

  // update UI for difficulty/streak
  const diffEl = document.getElementById('difficulty-level');
  if (diffEl) diffEl.textContent = difficultyLevel;
  const streakEl = document.getElementById('win-streak');
  if (streakEl) streakEl.textContent = winStreak;

  for (let i = 0; i < size * size; i++) {
    const cell = document.createElement('div');
    cell.classList.add('cell');
    cell.dataset.index = i;
    grid.appendChild(cell);
    cells.push(cell);
  }

  placeSolvablePairs();
  attachCellEvents();
}

function placeSolvablePairs() {
  const usedPositions = new Set();
  // number of pairs scales with difficulty (more pairs => harder)
  const numberOfPairs = Math.min(colors.length, 2 + difficultyLevel);

  // Choose colors uniformly at random from the full set (base + extras).
  // Shuffle the full color list and take the first `numberOfPairs` so each
  // color has equal chance (1/9) to be included in the selected set.
  const allColors = baseColors.concat(extraColors);
  const shuffled = shuffle(allColors.slice());
  const selected = shuffled.slice(0, numberOfPairs);

  // Place each selected color as solvable pair on the grid
  selected.forEach(color => {
    let placed = false;
    let safety = 0;
    while (!placed && safety < 500) {
      safety++;
      const isRow = Math.random() < 0.5;
      // gap increases slightly with difficulty to make connections longer
      const gapMin = Math.min(size - 2, 2 + Math.floor(difficultyLevel / 2));
      const gapMax = Math.min(size - 1, 4 + difficultyLevel);
      const gapRange = Math.max(0, gapMax - gapMin);
      const gap = gapRange > 0 ? Math.floor(Math.random() * (gapRange + 1)) + gapMin : gapMin;
      if (isRow) {
        const row = Math.floor(Math.random() * size);
        const col1 = Math.floor(Math.random() * (size - gap));
        const col2 = col1 + gap;
        const pos1 = row * size + col1;
        const pos2 = row * size + col2;
        if (!usedPositions.has(pos1) && !usedPositions.has(pos2)) {
          usedPositions.add(pos1);
          usedPositions.add(pos2);
          fillCell(pos1, color);
          fillCell(pos2, color);
          placed = true;
        }
      } else {
        const col = Math.floor(Math.random() * size);
        const row1 = Math.floor(Math.random() * (size - gap));
        const row2 = row1 + gap;
        const pos1 = row1 * size + col;
        const pos2 = row2 * size + col;
        if (!usedPositions.has(pos1) && !usedPositions.has(pos2)) {
          usedPositions.add(pos1);
          usedPositions.add(pos2);
          fillCell(pos1, color);
          fillCell(pos2, color);
          placed = true;
        }
      }
    }
  });
}

function fillCell(index, color) {
  const cell = cells[index];
  cell.style.background = color;
  cell.classList.add('filled');
  cell.dataset.color = color;
  // show emoji inside the cell (respect colourblindMode)
  cell.textContent = colourblindMode ? getEmojiForColor(color) : '';
}

function attachCellEvents() {
  document.addEventListener('mousedown', () => { isMouseDown = true; });
  document.addEventListener('mouseup', () => { isMouseDown = false; });

  cells.forEach(cell => {
    cell.addEventListener('click', () => paint(cell));
    cell.addEventListener('mousemove', () => {
      if (isMouseDown) paint(cell);
    });
  });
}

function paint(cell) {
  if (cell.classList.contains('filled')) return;
  if (!selectedColor) return;
  if (gameMode === 'timed' && timerExpired) return;
  cell.style.background = selectedColor;
  cell.dataset.color = selectedColor;
  cell.textContent = colourblindMode ? getEmojiForColor(selectedColor) : '';
}

document.getElementById('check-win').addEventListener('click', () => {
  if (gameWon) return;

  let allConnected = true;

  // determine which colors are present on the board (both prefilled and painted)
  const presentColors = Array.from(new Set(cells.filter(c => c.dataset.color).map(c => c.dataset.color)));
  presentColors.forEach(color => {
    const colorCells = cells.filter(c => c.dataset.color === color);
    if (colorCells.length === 0) {
      allConnected = false;
      return;
    }

    const visited = new Set();
    const startIdx = parseInt(colorCells[0].dataset.index, 10);
    const queue = [startIdx];
    visited.add(startIdx);

    while (queue.length > 0) {
      const currentIdx = queue.shift();
      const neighbors = getNeighbors(currentIdx);
      neighbors.forEach(n => {
        if (!visited.has(n) && cells[n].dataset.color === color) {
          visited.add(n);
          queue.push(n);
        }
      });
    }

    if (visited.size !== colorCells.length) {
      allConnected = false;
    }
  });

  if (allConnected) {
    const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
    document.getElementById('status').textContent = t.statusWin;
    document.getElementById('status').className = 'win';
    winCount++;
    winStreak++;
    // increase difficulty a bit for next round
    difficultyLevel = Math.min(MAX_DIFFICULTY, difficultyLevel + 1);
    document.getElementById('win-count').textContent = winCount;
    document.getElementById('difficulty-level').textContent = difficultyLevel;
    document.getElementById('win-streak').textContent = winStreak;
    gameWon = true;
    // If in timed mode and timer still running, record remaining time as a score for this duration
    if (gameMode === 'timed' && !timerExpired) {
      const timerEl = document.getElementById('timer');
      const remaining = timerEl && timerEl.dataset && timerEl.dataset.remaining ? parseInt(timerEl.dataset.remaining, 10) : 0;
      const key = String(timedDuration);
      if (!leaderboard[key]) leaderboard[key] = [];
      leaderboard[key].push(remaining);
      leaderboard[key].sort((a,b)=>b-a); // best (more remaining) first
      leaderboard[key] = leaderboard[key].slice(0,20);
      saveLeaderboard(leaderboard);
    }
  } else {
    const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
    document.getElementById('status').textContent = t.statusNotWin;
    document.getElementById('status').className = 'error';
  }
});

function getNeighbors(idx) {
  const neighbors = [];
  const row = Math.floor(idx / size);
  const col = idx % size;
  if (row > 0) neighbors.push(idx - size);
  if (row < size - 1) neighbors.push(idx + size);
  if (col > 0) neighbors.push(idx - 1);
  if (col < size - 1) neighbors.push(idx + 1);
  return neighbors;
}

// Format seconds to MM:SS
function formatTime(s){
  const mm = String(Math.floor(s/60)).padStart(2,'0');
  const ss = String(s%60).padStart(2,'0');
  return `${mm}:${ss}`;
}

// Called when countdown reaches zero
function onTimerEnd(durationMinutes){
  timerExpired = true;
  // disable painting: paint() checks timerExpired
  // Show scoreboard modal with leaderboard data
  const sb = document.getElementById('scoreboard-modal');
  const gridEl = document.getElementById('scoreboard-grid');
  if (!sb || !gridEl) return;
  // build columns for durations
  gridEl.innerHTML = '';
  const durations = [1,2,3,5,10];
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
  durations.forEach(d => {
    const col = document.createElement('div'); col.className = 'scoreboard-column';
    const h = document.createElement('h3'); h.textContent = d + ' min'; col.appendChild(h);
    const solved = document.createElement('div'); solved.className = 'solved-count'; solved.textContent = `${t.solvedLabel}: ${leaderboard[String(d)] ? leaderboard[String(d)].length : 0}`; col.appendChild(solved);
    const list = document.createElement('div');
    const entries = leaderboard[String(d)] ? leaderboard[String(d)].slice() : [];
    if (entries.length === 0) {
      const e = document.createElement('div'); e.className = 'score-entry zero'; e.textContent = '0:00'; list.appendChild(e);
    } else {
      entries.forEach(sec => { const e = document.createElement('div'); e.className = 'score-entry'; e.textContent = formatTime(sec); list.appendChild(e); });
    }
    col.appendChild(list);
    gridEl.appendChild(col);
  });
  sb.classList.remove('modal-hidden');
}

// Scoreboard close button: hide modal and return to start screen
const scoreboardClose = document.getElementById('scoreboard-close');
if (scoreboardClose) scoreboardClose.addEventListener('click', ()=>{
  const sb = document.getElementById('scoreboard-modal'); if (sb) sb.classList.add('modal-hidden');
  const startScreen = document.getElementById('start-screen'); if (startScreen) startScreen.style.display = 'flex';
});
