# UNDERFRONT

A single-player WWI strategy game with simultaneous surface combat and underground excavation. A seeded simulation advances at 20 ticks per second. PixiJS renders the terrain and units independently. The game runs entirely in the browser.

## Run

Use Node.js 22.12+ and npm. Run `npm install` and `npm run dev` from the project root. Open the address printed by Vite. Use `npm test` for simulation regression checks and `npm run build` for the TypeScript check and production bundle.

## Command

- Select a trench by tapping its flag or earthworks. Reinforce moves your surface force to the selected allied trench. Advance and Retreat move the whole force toward the opposing HQ or your rear line.
- Recruit infantry for mobility, machine guns for trench defense, and engineers for concurrent excavations. Each unit marker represents a squad or team.
- Switch between the combined map, surface, and tunnels using the tabs above the battlefield. Drag the map or use the arrows to pan when zoomed.
- In the tunnel view, select the enemy front trench, rear trench, or HQ. The map previews the route from the nearest completed passage. Check the price and estimated time, then confirm excavation. Supplies are paid upfront and the crew stays assigned until the route completes or is blocked.
- Breaking through under a trench removes its cover for 90 seconds. A completed passage becomes a starting point for future orders, shortening the trip to the next objective. A breakthrough under the enemy HQ removes 25 points of integrity once. A contested junction can block an operation. You can retry or choose a different target.
- Artillery suppresses units around the selected trench. Fortify protects an allied position. Reinforcements temporarily triples manpower income. These abilities cost supplies and recharge over time.
- Keys 1–8 correspond to the command cards. Space toggles pause and Escape cancels excavation. The field manual pauses simulation while open.
- Pressure the opposing HQ with surface troops and underground breakthroughs. After seven minutes, supply attrition increases pressure on both headquarters. Holding trenches reduces that attrition.

## Prototype scope

One procedural sector layout, two armies, and a fresh AI seed per match. Discovered tunnel segments stay visible. Underground contact resolves as an abstract team contest. The game emits `underfront:report` browser events for future audio integration. Match state lasts for the current page session.

The next development pass should use playtest data to tune match duration, unit costs, and the effectiveness of underground pressure.
