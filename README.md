# UNDERFRONT

A single-player WWI strategy game with simultaneous surface combat and underground excavation. A seeded simulation advances at 20 ticks per second. PixiJS renders the terrain and units independently. The game runs entirely in the browser.

## Run

Use Node.js 22.12+ and npm. Run `npm install` and `npm run dev` from the project root. Open the address printed by Vite. Use `npm test` for five simulation regression checks and `npm run build` for the TypeScript check and production bundle.

## Command

- Select a trench by tapping its flag or earthworks. Reinforce moves your surface force to the selected allied trench. Advance and Retreat move the whole force toward the opposing HQ or your rear line.
- Recruit infantry for mobility, machine guns for trench defense, and engineers for concurrent excavations. Each unit marker represents a squad or team.
- Tap a point on your existing passage, then tap a destination in the soil. Dragging from the passage works too. Completed and partially excavated passages support branches. An invalid destination keeps the current order open for correction.
- Artillery suppresses units around the selected trench. Fortify protects an allied position. Reinforcements temporarily triples manpower income. These abilities cost supplies and recharge over time.
- Keys 1–8 correspond to the command cards. Space toggles pause and Escape cancels excavation. The field manual pauses simulation while open.
- Reach the opposing HQ above or below ground to drain its integrity. After seven minutes, supply attrition increases pressure on both headquarters. Holding trenches reduces that attrition.

## Prototype scope

One procedural sector layout, two armies, and a fresh AI seed per match. Discovered tunnel segments stay visible. Underground contact resolves as an abstract team contest. The game emits `underfront:report` browser events for future audio integration. Match state lasts for the current page session.

The next development pass should use playtest data to tune match duration, unit costs, and the effectiveness of underground pressure.
