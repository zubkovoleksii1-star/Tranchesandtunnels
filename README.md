# UNDERFRONT

A single-player WWI strategy game with simultaneous surface combat and underground excavation. A seeded simulation advances at 20 ticks per second. PixiJS renders the terrain and units independently. The game runs entirely in the browser.

## Run

Use Node.js 22.12+ and npm. Run `npm install` and `npm run dev` from the project root. Open the address printed by Vite. Use `npm test` for simulation regression checks and `npm run build` for the TypeScript check and production bundle.

## Watch and draw

Both armies run themselves. Their surface troops advance, fight and receive reinforcements. Their engineers pick their own underground objectives and dig continuously. A match runs from start to finish without player orders.

- Watch the lead allied engineer or switch to the full battlefield. The narrow profile beneath the map shows tunnels and objectives. Each side’s HUD counts the targets it has connected.
- To give allied engineers a manual route, draw a line in the soil with a mouse or finger and release. The line starts at their current position and follows the bends you draw. The simulation pauses during the gesture. The optional drawing button also pauses the battle while you plan.
- The crew excavates the route gradually. At the final waypoint the bot takes over. You can draw a replacement, return control to the bot early, or cancel an unfinished stroke with Escape.
- Reaching a marked zone beneath an enemy trench temporarily removes cover. Reaching the opposing HQ damages its integrity. Either side wins by connecting all three objectives underground or by destroying the opposing HQ.
- Space pauses the match. Opening the field manual also pauses the simulation.

## Prototype scope

One procedural sector layout, two armies, and a fresh AI seed per match. Discovered tunnel segments stay visible. Underground contact resolves as an abstract team contest. The game emits `underfront:report` browser events for future audio integration. Match state lasts for the current page session.
