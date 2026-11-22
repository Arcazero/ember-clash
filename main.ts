// Ember Clash — the hand-in program (Node 22, standard library only).
//
// It gathers the game and its screenshots from beside this file, lays them
// out under /output (or $MAKEFUN_OUTPUT_DIR outside the grader) and writes
// the dossier the judge reads, using the vendored make.fun library.
//
// The game itself is static files under game/ (index.html + style.css +
// main.js, no build step, no network requests). The four screenshots under
// screenshots/ are real renders of that code, staged with ?shot=title|play|
// win|loss and captured at 1280x720.
//
// Play it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The repository root: the folder this file lives in.
const root = fileURLToPath(new URL('.', import.meta.url));
// Where the grader reads the entry from; /output inside its container.
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outDir, { recursive: true });

// The playable game, whole and unchanged.
cpSync(join(root, 'game'), join(outDir, 'game'), { recursive: true });

// Its screenshots, when they exist (they always do for a finished entry).
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
const shotsDir = join(root, 'screenshots');
if (existsSync(shotsDir)) cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });

// The dossier the judge reads: the screenshots plus a text of the game's
// source, as buildDossier writes them. The caps mirror the scorer's own
// (reference/gate.json): at most 4 screenshots, each at most 256 KiB; game/
// at most 993 files and 48 MiB in all, no path over 1000 bytes; the dossier
// text capped at 160 KiB. Only text_max_bytes shapes the bytes; the other
// caps refuse an entry the scorer would refuse, so they are set to match.
writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
