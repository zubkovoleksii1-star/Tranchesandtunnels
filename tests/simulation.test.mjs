import {after, test} from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'vite'

const server = await createServer({optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true, hmr:false}, appType:'custom'})
const {Simulation} = await server.ssrLoadModule('/src/game/simulation.ts')
const {rules} = await server.ssrLoadModule('/src/game/config.ts')
after(() => server.close())
function run(game, seconds) {
  for (let i=0; i<seconds*20; i++) game.step(0.05)
}

function until(game,predicate,seconds=350){
  for(let i=0;i<seconds*20&&!predicate()&&game.winner===null;i++)game.step(.05)
  assert(predicate(),'Simulation did not reach the expected state')
}

function excavationOnly(seed=412){
  const game=new Simulation(seed)
  game.nextAI=Infinity
  game.armies[0].goal=345
  game.enemyActiveDig.delay=Infinity
  game.net.paths=game.net.paths.filter(tunnel=>tunnel.side===0)
  return game
}

test('both armies advance, recruit and excavate autonomously', () => {
  const game=new Simulation(412)
  const blueStart=game.digFace
  const redStart=game.enemyDigFace
  assert(game.autoSteer)
  assert(game.net.paths.every(t=>!t.side||!t.seen))
  run(game,22)
  assert(game.digFace.x>blueStart.x+40)
  assert(game.enemyDigFace.x<redStart.x-40)
  assert(game.armies.every(army=>army.stats.units>0))
  assert(game.armies.every(army=>army.stats.length>0))
  assert(game.units.some(unit=>unit.side===0&&unit.x>390))
  assert.equal(game.botTarget(0),'front')
  assert.equal(game.botTarget(1),'front')
})

test('drawn routes follow turns and backtracking, then return to autonomy', () => {
  const game=excavationOnly()
  const start=game.digFace
  const points=[{x:start.x+48,y:start.y-34},{x:start.x+79,y:start.y+9},{x:start.x+33,y:start.y+38}]
  assert.equal(game.setDrawnRoute([start,...points]),true)
  assert.equal(game.autoSteer,false)
  assert.equal(game.setDrawnRoute([{x:start.x+2,y:start.y}]),false)
  assert.deepEqual(game.drawnRoute,points)
  assert(game.digDirection.y<0)
  until(game,()=>game.drawnRoute.length===2,45)
  assert(game.digDirection.y>0)
  until(game,()=>game.drawnRoute.length===1,45)
  assert(game.digDirection.x<0)
  until(game,()=>game.autoSteer,45)
  assert.deepEqual(game.digFace,points[2])
  assert.equal(game.drawnRoute.length,0)
  run(game,3)
  assert(game.digFace.x>points[2].x)
})

test('long strokes retain their final waypoint and can be cancelled explicitly', () => {
  const game=excavationOnly()
  const points=Array.from({length:600},(_,i)=>({x:316+i*1.25,y:275+(i%11)*6}))
  assert(game.setDrawnRoute(points))
  assert(game.drawnRoute.length<=48)
  assert.deepEqual(game.drawnRoute.at(-1),points.at(-1))
  game.setAutoSteer(true)
  assert(game.autoSteer)
  assert.equal(game.drawnRoute.length,0)
})

test('the physical tunnel must reach the target and only breaches its cover once', () => {
  const game=excavationOnly()
  assert(game.setDrawnRoute([{x:420,y:286},{x:880,y:286},{x:980,y:286},{x:1040,y:388}]))
  until(game,()=>game.digFace.x>=880)
  assert.equal(game.tunnelTargetReached(0,'front'),false)
  assert.equal(game.trenches[2].breach,0)
  until(game,()=>game.tunnelTargetReached(0,'front'))
  assert.equal(game.trenches[2].breach,rules.breakthrough.breachSeconds)
  assert.equal(game.armies[1].hp,100)
  game.setHeading('down')
  run(game,rules.breakthrough.breachSeconds+1)
  assert.equal(game.trenches[2].breach,0)
})

test('enemy contact pauses the crew without discarding a drawn route', () => {
  const game=excavationOnly(123)
  game.armies[1].engineers=4
  game.net.paths.push({a:{x:410,y:220},b:{x:410,y:388},p:1,side:1,seen:false,blocked:false,delay:0})
  const points=[{x:450,y:320},{x:515,y:355}]
  assert(game.setDrawnRoute(points))
  until(game,()=>game.activeDig.delay>0,35)
  const heldFace=game.digFace
  assert(game.armies[0].stats.contacts>0)
  assert.deepEqual(game.drawnRoute,points)
  run(game,1)
  assert.deepEqual(game.digFace,heldFace)
  until(game,()=>game.digFace.x>=470,40)
  assert.equal(game.autoSteer,false)
  assert.equal(game.drawnRoute.length,1)
})

test('the manual crew reverses at the boundary and can still accept a path', () => {
  const game=excavationOnly()
  game.setAutoSteer(false)
  game.setHeading('straight')
  until(game,()=>game.digDirection.x<0)
  assert(game.digFace.x>=1232)
  const face=game.digFace
  assert(game.activeDig.reusing)
  run(game,3)
  assert(game.digFace.x<face.x)
  assert(game.setDrawnRoute([{x:game.digFace.x-45,y:game.digFace.y-20}]))
  assert(game.digDirection.y<0)
})

test('abilities charge supplies, apply effects and enforce cooldowns', () => {
  const g=new Simulation(95)
  g.armies[0].sup=100
  assert.equal(g.ability(0,'fort',1),'')
  assert(g.trenches[1].fort>0)
  assert(g.ability(0,'fort',1))
  assert.equal(g.ability(0,'reserve',1),'')
  assert.equal(g.ability(0,'shell',2),'')
  run(g,1)
  assert(g.armies[0].mp>50)
  assert(g.suppression[1].time>0)
  assert(g.armies[0].sup<100)
})

test('surface combat records hits and a single persistent casualty for a defeated unit', () => {
  const g=new Simulation(412)
  g.nextAI=Infinity
  g.units=[]
  g.spawn(0,'infantry',550)
  g.spawn(1,'infantry',580)
  const [attacker,defender]=g.units
  attacker.reload=0
  defender.reload=100
  let draws=0
  g.random=()=>{draws++;return .5}
  g.step(.05)
  assert.equal(g.impacts[0].x,defender.x)
  assert.equal(g.impacts[0].side,defender.side)
  assert.equal(g.impacts[0].killed,false)
  assert.equal(g.casualties.length,0)
  assert.equal(g.fire[0].side,attacker.side)

  attacker.reload=0
  defender.hp=1
  g.step(.05)
  const kill=g.impacts.at(-1)
  assert.equal(kill.killed,true)
  assert.equal(g.units.includes(defender),false)
  assert.deepEqual(g.casualties,[{x:kill.x,side:kill.side,seed:kill.seed,time:g.time}])
  assert.equal(draws,2)
  run(g,1)
  assert.equal(g.impacts.length,0)
  assert.equal(g.fire.length,0)
  assert.equal(g.casualties.length,1)
})

test('surface combat bounds visual history even during heavy fighting', () => {
  const g=new Simulation(412)
  g.nextAI=Infinity
  g.units=[]
  for(let i=0;i<150;i++)g.spawn(0,'infantry',550)
  for(let i=0;i<150;i++)g.spawn(1,'infantry',580)
  for(const unit of g.units){
    unit.reload=0
    if(unit.side===1)unit.hp=1
  }
  g.step(.05)
  assert.equal(g.units.length,150)
  assert.equal(g.fire.length,128)
  assert.equal(g.impacts.length,128)
  assert.equal(g.casualties.length,96)
  assert.equal(g.casualties.at(-1).seed,g.impacts.at(-1).seed)
})

for(const [seed,expected] of [[1,1],[2,0]]){
  test('bot-only match with seed '+seed+' reaches '+(expected?'defeat':'victory'), () => {
    const game=new Simulation(seed)
    until(game,()=>game.winner!==null,580)
    assert.equal(game.winner,expected)
    assert(game.armies.every(army=>army.stats.units>0&&army.stats.length>0))
    assert(game.casualties.length>0)
    assert(game.tunnelTargets(expected).every(target=>game.tunnelTargetReached(expected,target.id)))
    assert.equal(game.armies[1-expected].hp,0)
  })
}
