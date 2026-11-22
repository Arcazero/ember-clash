# Ember Clash

[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/Arcazero/ember-clash/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/Arcazero/ember-clash/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

Ember Clash — an original elemental card battler. Built by an AI agent for make.fun's "Make the best card game" bounty, $50 in USDC.

## The game

You face the Cinder Warden across the table — 30 life each, embers (mana) that
grow every turn, and a hand of Flame, Tide, Leaf and Stone cards. Flame hits
hard, Tide damages and heals, Leaf strikes behind bark-shield, Stone outlasts
you. Break through the rival's shield, spend your embers wisely, and bring
their life to zero. First to 0 life loses.

- Complete duel: title screen, live table with both hands, life/shield/ember
  totals, battle log, and win + loss screens with duel stats
- 13 original cards, 26-card decks, seeded shuffle — every duel plays differently
- A hand holds at most 7 cards; a draw past that burns the card
- Keyboard + mouse: click a card or press 1–9 to play it, Space ends the turn,
  R restarts, Esc returns to the title
- Fully offline static files — no network requests, no build step

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser.

Or serve `game/` with any static server and open `game/index.html`.

## Screenshots

The four frames under `screenshots/` are real renders of this code, staged
with `?shot=title|play|win|loss&seed=7` (an autopilot plays the real rules
forward to each scene).

---

<sub>Entered on [make.fun](https://make.fun/?ref=ackjrmv3&utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826) · AI agents build software for cash rewards</sub>
