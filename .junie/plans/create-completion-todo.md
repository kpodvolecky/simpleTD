---
sessionId: session-261012-125817-1ufr
---

# Requirements

### Overview & Goals

The task is to **analyze whether SimpleTD is implemented per `docs/ASSIGNMENT.md`** and to produce a new root-level **`TODO.md`** that lists the concrete steps still needed to complete the implementation.

The outcome is a single documentation deliverable (`TODO.md`) — no gameplay/source code changes are part of this task. `TODO.md` must accurately reflect the current state of the codebase (what is done vs. what is missing) and give an actionable, prioritized checklist.

### Scope

**In Scope**
- A gap analysis of the existing code against every section of `docs/ASSIGNMENT.md` (§3 gameplay, §4 technical, §5 combat, §6 data, §7 architecture, §8 UI/UX, §9 testing, §10 deliverables, §11 acceptance criteria).
- Authoring `TODO.md` at the project root with: an "already implemented" inventory, a prioritized list of remaining work items, and an acceptance-criteria checklist.
- Each remaining item references the concrete file(s) that must change.

**Out of Scope**
- Actually implementing the missing features (audio, settings UI, win/lose screens, extra tests, validation).
- Changing existing engine/system/render code.
- Stretch goals from §13 (upgrades, flying enemies, level editor, endless mode).

### Functional Requirements
- `TODO.md` must clearly separate **Done** from **To Do**.
- Every To Do item must be specific and actionable (what, which file, why — cite the assignment section).
- Items must be grouped and ordered by priority (gameplay-correctness/acceptance-criteria gaps first, polish last).
- Include a checklist mapping to §11 Acceptance Criteria so progress is trackable.
- `TODO.md` must note that `npm run build` and `npm test` currently pass (15/15) as the baseline.

# Gap Analysis

### Current Implementation (verified by code review)

The project already implements the great majority of the assignment and matches the §7 architecture:

- **Engine:** [Grid.ts](air-file://b9jn8mg4lfrou7qfgt6p/home/karel/IntelliAirProjects/SimpleTD/src/engine/Grid.ts?type=file&root=%252F), [Pathfinding.ts](air-file://b9jn8mg4lfrou7qfgt6p/home/karel/IntelliAirProjects/SimpleTD/src/engine/Pathfinding.ts?type=file&root=%252F) (distance fields, `wouldBlockRoute`), [GameState.ts](air-file://b9jn8mg4lfrou7qfgt6p/home/karel/IntelliAirProjects/SimpleTD/src/engine/GameState.ts?type=file&root=%252F), [GameLoop.ts](air-file://b9jn8mg4lfrou7qfgt6p/home/karel/IntelliAirProjects/SimpleTD/src/engine/GameLoop.ts?type=file&root=%252F).
- **Systems:** [MovementSystem.ts](air-file://b9jn8mg4lfrou7qfgt6p/home/karel/IntelliAirProjects/SimpleTD/src/systems/MovementSystem.ts?type=file&root=%252F) (continuous movement, no-path fallback, boundary-only decisions), [CombatSystem.ts](air-file://b9jn8mg4lfrou7qfgt6p/home/karel/IntelliAirProjects/SimpleTD/src/systems/CombatSystem.ts?type=file&root=%252F) (targeting strategies, tie-break, splash, slow, enemies-attack-towers with per-tick accumulation), [SpawnSystem.ts](air-file://b9jn8mg4lfrou7qfgt6p/home/karel/IntelliAirProjects/SimpleTD/src/systems/SpawnSystem.ts?type=file&root=%252F) (10s countdown, overlapping waves), EconomySystem.
- **Combat/model (§5):** percentage armor + min-damage floor and `inRange` ceil rule in [balance.ts](air-file://b9jn8mg4lfrou7qfgt6p/home/karel/IntelliAirProjects/SimpleTD/src/config/balance.ts?type=file&root=%252F).
- **Data (§6/§10):** 3 levels, 4 tower types, 4 enemy types.
- **Render/Input:** [Renderer.ts](air-file://b9jn8mg4lfrou7qfgt6p/home/karel/IntelliAirProjects/SimpleTD/src/render/Renderer.ts?type=file&root=%252F) (DPI scaling, build preview, `!` icon for block), [InputController.ts](air-file://b9jn8mg4lfrou7qfgt6p/home/karel/IntelliAirProjects/SimpleTD/src/input/InputController.ts?type=file&root=%252F) (pointer events, touch-action none), [Hud.ts](air-file://b9jn8mg4lfrou7qfgt6p/home/karel/IntelliAirProjects/SimpleTD/src/render/Hud.ts?type=file&root=%252F).
- **Persistence:** [Save.ts](air-file://b9jn8mg4lfrou7qfgt6p/home/karel/IntelliAirProjects/SimpleTD/src/storage/Save.ts?type=file&root=%252F) (linear unlock, graceful fallback, `settings.volume`).
- **Build/tests:** `npm run build` and `npm test` pass (15/15); README exists.

### Identified Gaps (the content of TODO.md)

1. **Audio & feedback sounds (§8):** no audio code anywhere; `settings.volume` is stored in [Save.ts](air-file://b9jn8mg4lfrou7qfgt6p/home/karel/IntelliAirProjects/SimpleTD/src/storage/Save.ts?type=file&root=%252F) but never used. No sounds for place/invalid/hit/leak/wave-start/win/lose.
2. **Settings UI (§8/§4.5):** the §8 "settings" menu does not exist — [main.ts](air-file://b9jn8mg4lfrou7qfgt6p/home/karel/IntelliAirProjects/SimpleTD/src/main.ts?type=file&root=%252F) `showMenu()` only renders level select; stored volume cannot be changed by the user.
3. **Win/Lose screens (§8):** result is shown only as HUD status text in [Hud.ts](air-file://b9jn8mg4lfrou7qfgt6p/home/karel/IntelliAirProjects/SimpleTD/src/render/Hud.ts?type=file&root=%252F); there is no dedicated overlay with replay / next-level / back-to-menu actions (`handleResult()` in [main.ts](air-file://b9jn8mg4lfrou7qfgt6p/home/karel/IntelliAirProjects/SimpleTD/src/main.ts?type=file&root=%252F) only saves progress).
4. **Level validity check (§3.1):** [content.ts](air-file://b9jn8mg4lfrou7qfgt6p/home/karel/IntelliAirProjects/SimpleTD/src/data/content.ts?type=file&root=%252F) casts JSON with no validation — no checks for coinciding cell types, each spawn having exactly one target, targets not fully walled, or a path existing from every spawn.
5. **Missing §9 unit tests:** `tests/` only covers pathfinding and combat. Economy (spend/reward, 75% sell rounding), win/lose conditions, and wave-scheduling timing are untested.
6. **Accessibility polish (§8):** block-preview has a `!` icon but other validity/feedback states are color-only; mobile font-size/portrait-landscape review not done.
7. **Manual/E2E smoke test (§9/§11):** no documented cross-browser + mobile-touch smoke-test checklist.

### TODO.md Structure (proposed)
```
# SimpleTD — Completion TODO
## Status / baseline (build & tests pass)
## Already implemented (inventory vs ASSIGNMENT.md)
## Remaining work (prioritized)
### P1 — Acceptance-criteria / correctness gaps
### P2 — UI/UX & feedback
### P3 — Tests & validation
## Acceptance-criteria checklist (§11)
```
Each remaining item: short title, affected file(s), assignment section reference.

# Delivery Steps

###   Step 1: Author TODO.md skeleton with baseline and "already implemented" inventory
A root `TODO.md` exists with the document structure, the current build/test baseline, and an accurate inventory of what is already done.

- Create `TODO.md` at the project root.
- Add a top section stating the baseline: `npm run build` passes and `npm test` passes (15/15), README present.
- Add an "Already implemented" inventory mapping delivered functionality to assignment sections: engine (Grid/Pathfinding/GameState/GameLoop), systems (Movement/Combat/Spawn/Economy), §5 damage model in `balance.ts`, data content (3 levels, 4 towers, 4 enemies), Renderer DPI + build preview, pointer input, linear-unlock persistence in `Save.ts`.
- Reference concrete file paths so the inventory is verifiable.

###   Step 2: Add prioritized remaining-work items for gameplay/UX gaps
`TODO.md` lists the concrete missing features, grouped P1/P2 and ordered by impact, each citing the file to change and the assignment section.

- P1 (correctness/acceptance): level-validity check in `src/data/content.ts` per §3.1 (coinciding cell types, one-target-per-spawn, target not fully walled, path-exists); dedicated win/lose screens with replay/next-level/menu actions (extend `main.ts` `handleResult()` / add overlay).
- P2 (UI/UX & feedback per §8): audio system + feedback sounds (place/invalid/hit/leak/wave-start/win/lose) wired to `settings.volume`; a settings menu in `main.ts` `showMenu()` to adjust volume; accessibility polish (non-color-only validity cues, mobile font sizes, portrait/landscape check).
- For each item include: short title, affected file(s), and the §ref.

###   Step 3: Add testing/validation TODO section and acceptance-criteria checklist
`TODO.md` ends with a test-coverage plan and a trackable §11 acceptance checklist.

- P3 section listing missing §9 unit tests to add under `tests/`: economy (spend/reward and 75% sell rounding), win/lose condition evaluation, and wave-scheduling/countdown timing.
- Add a manual/E2E smoke-test checklist (§9/§11): load level, build maze, run wave, verify reroute and no-path tower destruction, win/lose; test on one desktop and one mobile/touch browser.
- Add an "Acceptance criteria (§11)" checklist with checked/unchecked boxes reflecting current status so completion can be tracked.