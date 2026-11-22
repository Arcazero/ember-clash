// Ember Clash — an original elemental card battler.
// You vs the Cinder Warden: 30 life each, embers (mana) grow 1..10 per turn,
// a hand of elemental cards with a cost, attack, shield and/or heal. Play cards
// to break through the rival's shield and life; first to 0 life loses.
// Keyboard: 1-9 play a card, Space ends the turn, R restarts, Esc goes to title.
// ?seed=N fixes the shuffle. ?shot=title|play|win|loss stages that scene from
// real play (an autopilot plays the real rules forward) and sets
// window.__shotReady, so screenshots are true renders of this code.

const $ = (id) => document.getElementById(id);

// ------------------------------------------------------------------ cards
const ELEMENTS = {
  flame: { label: 'FLAME', glyph: 'F' },
  tide: { label: 'TIDE', glyph: 'T' },
  leaf: { label: 'LEAF', glyph: 'L' },
  stone: { label: 'STONE', glyph: 'S' },
};

// cost in embers; atk = damage; shield absorbs damage; heal restores life.
const CARDS = [
  { id: 'spark', name: 'Ember Spark', el: 'flame', cost: 1, atk: 2 },
  { id: 'fang', name: 'Cinder Fang', el: 'flame', cost: 2, atk: 4 },
  { id: 'wildfire', name: 'Wildfire', el: 'flame', cost: 4, atk: 8 },
  { id: 'inferno', name: 'Inferno', el: 'flame', cost: 6, atk: 12 },
  { id: 'tidecaller', name: 'Tidecaller', el: 'tide', cost: 2, atk: 3, heal: 2 },
  { id: 'current', name: 'Deep Current', el: 'tide', cost: 3, atk: 5, heal: 2 },
  { id: 'rain', name: 'Spring Rain', el: 'tide', cost: 2, heal: 7 },
  { id: 'thorn', name: 'Thorn Whip', el: 'leaf', cost: 1, atk: 2, shield: 2 },
  { id: 'bramble', name: 'Bramble Guard', el: 'leaf', cost: 3, atk: 3, shield: 5 },
  { id: 'snare', name: 'Root Snare', el: 'leaf', cost: 2, atk: 4, shield: 2 },
  { id: 'fist', name: 'Stone Fist', el: 'stone', cost: 2, atk: 2, shield: 4 },
  { id: 'wall', name: 'Granite Wall', el: 'stone', cost: 3, shield: 9 },
  { id: 'avalanche', name: 'Avalanche', el: 'stone', cost: 5, atk: 7, shield: 3 },
];
const CARD_BY_ID = Object.fromEntries(CARDS.map((c) => [c.id, c]));

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffledDeck(rng) {
  const ids = [];
  for (const c of CARDS) ids.push(c.id, c.id); // two copies of each card
  for (let i = ids.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}

// ------------------------------------------------------------------ state
function newGame(seed) {
  const rng = mulberry32(seed);
  const s = {
    seed,
    rng,
    screen: 'title', // title | play | win | loss
    turn: 1,
    over: false,
    busy: false, // AI is thinking (blocks input)
    you: { life: 30, maxLife: 30, shield: 0, mana: 1, manaMax: 1, deck: shuffledDeck(rng), hand: [], discard: [] },
    foe: { life: 30, maxLife: 30, shield: 0, mana: 1, manaMax: 1, deck: shuffledDeck(rng), hand: [], discard: [] },
    log: [],
    damageDealt: 0,
    cardsPlayed: 0,
    turnsPlayed: 0,
  };
  drawCards(s, 'you', 5);
  drawCards(s, 'foe', 5);
  return s;
}

function drawCards(s, who, n) {
  const p = s[who];
  for (let i = 0; i < n; i += 1) {
    if (p.deck.length === 0) {
      if (p.discard.length === 0) return;
      p.deck = p.discard; p.discard = [];
      for (let k = p.deck.length - 1; k > 0; k -= 1) {
        const j = Math.floor(s.rng() * (k + 1));
        [p.deck[k], p.deck[j]] = [p.deck[j], p.deck[k]];
      }
    }
    const id = p.deck.pop();
    // A hand holds at most 7 cards; a draw past that burns the card.
    if (p.hand.length >= 7) p.discard.push(id);
    else p.hand.push(id);
  }
}

function sideName(who) { return who === 'you' ? 'You' : 'Cinder Warden'; }

// Resolve one card: spend mana, apply damage (through shield), shield, heal.
function playCard(s, who, handIndex) {
  const p = s[who];
  const foe = s[who === 'you' ? 'foe' : 'you'];
  const id = p.hand[handIndex];
  if (id === undefined) return null;
  const card = CARD_BY_ID[id];
  if (p.mana < card.cost) return null;
  p.hand.splice(handIndex, 1);
  p.discard.push(id);
  p.mana -= card.cost;
  s.cardsPlayed += 1;
  const parts = [];
  if (card.atk) {
    let dmg = card.atk;
    const absorbed = Math.min(foe.shield, dmg);
    foe.shield -= absorbed; dmg -= absorbed;
    foe.life = Math.max(0, foe.life - dmg);
    if (who === 'you') s.damageDealt += card.atk;
    parts.push(`${card.atk} damage${absorbed ? ` (${absorbed} absorbed by shield)` : ''}`);
  }
  if (card.shield) { p.shield += card.shield; parts.push(`+${card.shield} shield`); }
  if (card.heal) {
    const healed = Math.min(card.heal, p.maxLife - p.life);
    p.life += healed; parts.push(`heal ${healed}`);
  }
  const line = `${sideName(who)} played ${card.name} — ${parts.join(', ')}.`;
  s.log.push(line);
  if (foe.life <= 0) { s.over = true; s.screen = who === 'you' ? 'win' : 'loss'; }
  return line;
}

// Pick the best affordable card by value per ember; 'weak' picks the worst
// affordable card (or nothing half the time) — used to stage win/loss shots.
function chooseCard(s, who, style) {
  const p = s[who];
  let best = -1; let bestScore = style === 'weak' ? Infinity : -Infinity;
  for (let i = 0; i < p.hand.length; i += 1) {
    const c = CARD_BY_ID[p.hand[i]];
    if (c.cost > p.mana) continue;
    const score = ((c.atk || 0) * 2 + (c.shield || 0) + (c.heal || 0) * 1.5) / c.cost;
    if (style === 'weak' ? score < bestScore : score > bestScore) { bestScore = score; best = i; }
  }
  if (best === -1) return -1;
  if (style === 'weak' && s.rng() < 0.5) return -1;
  return best;
}

// One full turn for a side: refill mana, draw, then play cards per policy.
function takeTurn(s, who, style) {
  const p = s[who];
  p.manaMax = Math.min(s.turn, 10);
  p.mana = p.manaMax;
  drawCards(s, who, 1);
  let guard = 0;
  while (!s.over && guard < 12) {
    const idx = chooseCard(s, who, style);
    if (idx === -1) break;
    playCard(s, who, idx);
    guard += 1;
  }
}

// ------------------------------------------------------------------ live game
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

let state = newGame(seed);
let best = 0;
try { best = Number.parseInt(window.localStorage.getItem('ember-clash-best') ?? '0', 10) || 0; } catch { /* storage off */ }

function saveBest(value) {
  try { window.localStorage.setItem('ember-clash-best', String(value)); } catch { /* storage off */ }
}

function logLines() { return state.log.slice(-4); }

function render() {
  const s = state;
  $('stat-turn').textContent = `Turn ${s.turn}`;
  $('stat-score').textContent = `Damage dealt: ${s.damageDealt}`;
  $('stat-best').textContent = best > 0 ? `Best damage: ${best}` : 'Best: —';
  for (const who of ['you', 'foe']) {
    const p = s[who];
    $(`${who}-life-fill`).style.width = `${(100 * p.life) / p.maxLife}%`;
    $(`${who}-life-text`).textContent = `${p.life} / ${p.maxLife}`;
    $(`${who}-shield`).textContent = `Shield ${p.shield}`;
    $(`${who}-deck`).textContent = `Deck ${p.deck.length}`;
  }
  $('foe-hand-count').textContent = `Hand ${s.foe.hand.length}`;
  $('you-ember').textContent = `Embers ${s.you.mana} / ${s.you.manaMax}`;
  $('foe-hand').innerHTML = s.foe.hand.map(() => '<div class="card-back">E</div>').join('');
  $('player-hand').innerHTML = '';
  s.you.hand.forEach((id, i) => {
    const c = CARD_BY_ID[id];
    const el = ELEMENTS[c.el];
    const div = document.createElement('div');
    div.className = `card el-${c.el}${s.you.mana < c.cost || s.busy || s.screen !== 'play' ? ' unaffordable' : ''}`;
    const effect = [
      c.atk ? `Deals ${c.atk} damage.` : '',
      c.shield ? `Gain ${c.shield} shield.` : '',
      c.heal ? `Restore ${c.heal} life.` : '',
    ].filter(Boolean).join(' ');
    div.innerHTML = `<span class="cost">${c.cost}</span><span class="key">${i + 1}</span>`
      + `<div class="el-band">${el.label}</div><div class="glyph">${el.glyph}</div>`
      + `<div class="name">${c.name}</div><div class="effect">${effect}</div>`
      + `<div class="atk">${c.atk ? `⚔ ${c.atk}` : `✚ ${c.heal || c.shield}`}<small>${c.atk ? ' attack' : c.heal ? ' heal' : ' shield'}</small></div>`;
    div.addEventListener('click', () => tryPlayCard(i));
    $('player-hand').appendChild(div);
  });
  $('log').innerHTML = logLines().map((l) => `<div>${l}</div>`).join('')
    || '<div>Welcome to Ember Clash. Play a card to begin the duel.</div>';
  $('end-turn').disabled = s.busy || s.screen !== 'play';
  updateOverlay();
}

function updateOverlay() {
  const s = state;
  const ov = $('overlay');
  if (s.screen === 'play') { ov.classList.add('hidden'); return; }
  ov.classList.remove('hidden');
  const statsHtml = s.screen === 'title' ? '' :
    `<div>Damage dealt: <b>${s.damageDealt}</b> &nbsp;·&nbsp; Cards played: <b>${s.cardsPlayed}</b> &nbsp;·&nbsp; Turns: <b>${s.turnsPlayed}</b></div>`;
  $('overlay-stats').style.display = statsHtml ? '' : 'none';
  if (s.screen === 'title') {
    $('overlay-kicker').textContent = 'A DUEL OF ELEMENTAL CARDS';
    $('overlay-title').textContent = 'EMBER CLASH';
    $('overlay-title').className = '';
    $('overlay-text').textContent = 'You face the Cinder Warden across the table — 30 life each, '
      + 'embers that grow every turn, and a hand of Flame, Tide, Leaf and Stone cards. '
      + 'Break through their shield, spend your embers wisely, and bring their life to zero.';
    $('overlay-stats').innerHTML = best > 0 ? `<div>Best damage in a duel: <b>${best}</b></div>` : '';
    $('overlay-button').textContent = '▶  Start Duel';
    $('overlay-foot').textContent = 'Click a card or press 1–9 to play it · Space ends your turn · R restarts';
  } else if (s.screen === 'win') {
    $('overlay-kicker').textContent = 'THE WARDEN FALLS';
    $('overlay-title').textContent = 'VICTORY!';
    $('overlay-title').className = 'win';
    $('overlay-text').textContent = 'The Cinder Warden\u2019s last ember gutters out. The table is yours — '
      + 'a clean win, fought card by card.';
    $('overlay-stats').innerHTML = statsHtml;
    $('overlay-button').textContent = '↻  Duel Again';
    $('overlay-foot').textContent = 'Press R or click to play again.';
  } else {
    $('overlay-kicker').textContent = 'THE EMBERS FADE';
    $('overlay-title').textContent = 'DEFEAT';
    $('overlay-title').className = 'loss';
    $('overlay-text').textContent = 'The Cinder Warden sweeps your last card from the table. '
      + 'Shuffle up, rethink your embers — and take the rematch.';
    $('overlay-stats').innerHTML = statsHtml;
    $('overlay-button').textContent = '↻  Rematch';
    $('overlay-foot').textContent = 'Press R or click to try again.';
  }
}

function finishGame() {
  if (state.damageDealt > best) { best = state.damageDealt; saveBest(best); }
  render();
}

function tryPlayCard(i) {
  const s = state;
  if (s.screen !== 'play' || s.busy || s.over) return;
  const line = playCard(s, 'you', i);
  if (line === null) return;
  if (s.over) { finishGame(); return; }
  render();
}

function endTurn() {
  const s = state;
  if (s.screen !== 'play' || s.busy || s.over) return;
  s.busy = true;
  render();
  // The Warden plays one card at a time so the table can be watched.
  const foe = s.foe;
  foe.manaMax = Math.min(s.turn, 10);
  foe.mana = foe.manaMax;
  drawCards(s, 'foe', 1);
  const step = () => {
    if (s.over) { s.busy = false; finishGame(); return; }
    const idx = chooseCard(s, 'foe', 'strong');
    if (idx === -1) {
      s.busy = false;
      s.turn += 1;
      s.turnsPlayed += 1;
      s.you.manaMax = Math.min(s.turn, 10);
      s.you.mana = s.you.manaMax;
      drawCards(s, 'you', 1);
      s.log.push(`— Turn ${s.turn} — your embers refill to ${s.you.manaMax}.`);
      render();
      return;
    }
    playCard(s, 'foe', idx);
    render();
    if (s.over) { s.busy = false; finishGame(); return; }
    window.setTimeout(step, 650);
  };
  window.setTimeout(step, 650);
}

function startDuel() {
  state = newGame(Math.floor(Math.random() * 4294967296));
  state.screen = 'play';
  state.log.push('The duel begins. Your embers refill to 1 — play a card!');
  render();
}

$('end-turn').addEventListener('click', endTurn);
$('overlay-button').addEventListener('click', () => {
  if (state.screen === 'title') startDuel();
  else startDuel();
});
document.addEventListener('keydown', (e) => {
  if (state.screen === 'title' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); startDuel(); return; }
  if ((state.screen === 'win' || state.screen === 'loss') && (e.key === 'r' || e.key === 'R' || e.key === 'Enter')) { startDuel(); return; }
  if (e.key === 'Escape') { state = newGame(seed); render(); return; }
  if (e.key === 'r' || e.key === 'R') { if (state.screen !== 'title') startDuel(); return; }
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); endTurn(); return; }
  const n = Number.parseInt(e.key, 10);
  if (n >= 1 && n <= 9) tryPlayCard(n - 1);
});

// ------------------------------------------------------------- screenshots
// Stage a scene by playing the real rules forward with an autopilot.
function stageShot(name) {
  const s = newGame(seed);
  s.screen = 'play';
  if (name === 'title') { s.screen = 'title'; return s; }
  const styles = name === 'win' ? ['strong', 'weak'] : name === 'loss' ? ['weak', 'strong'] : ['strong', 'strong'];
  const maxTurns = name === 'play' ? 5 : 60;
  for (let t = 1; t <= maxTurns && !s.over; t += 1) {
    s.turn = t;
    s.turnsPlayed = t;
    takeTurn(s, 'you', styles[0]);
    if (s.over) break;
    takeTurn(s, 'foe', styles[1]);
    if (s.over) break;
    if (name === 'play' && t === maxTurns) {
      // Mid-duel: fresh turn, full hand, both fighters bloodied.
      s.turn = t + 1;
      s.you.manaMax = Math.min(s.turn, 10);
      s.you.mana = s.you.manaMax;
      drawCards(s, 'you', 1);
      break;
    }
  }
  if (name === 'play') s.screen = 'play';
  else s.screen = s.over ? (s.you.life > 0 ? 'win' : 'loss') : 'play';
  return s;
}

if (shot) {
  state = stageShot(shot);
  if (state.screen === 'win' || state.screen === 'loss') finishGame();
  render();
  let painted = 0;
  const paint = () => {
    render();
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  };
  requestAnimationFrame(paint);
} else {
  render();
}
