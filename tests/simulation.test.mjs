import {after, test} from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'vite'

const server = await createServer({optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true, hmr:false}, appType:'custom'})
const {Simulation} = await server.ssrLoadModule('/src/game/simulation.ts')
after(() => server.close())
function run(game, seconds) {
  for (let i=0; i<seconds*20; i++) game.step(0.05)
}

test('excavation progresses, consumes a crew and supports connected branches', () => {
  const g=new Simulation(412)
  assert(g.net.paths.every(t=>!t.side || !t.seen))
  const start={x:230,y:292}, end={x:385,y:347}
  assert(g.dig(0,{x:199,y:407},end))
  assert.equal(g.dig(0,start,end),'')
  const tunnel=g.net.paths.at(-1)
  assert.equal(tunnel.p,0)
  assert.equal(g.dig(0,start,{x:345,y:365}),'All engineers are busy.')
  run(g,5)
  assert(tunnel.p>0 && tunnel.p<1)
  run(g,40)
  assert.equal(tunnel.p,1)
  assert.equal(g.dig(0,{x:307.5,y:319.5},{x:340,y:399}),'')
  assert(g.net.paths.some(t=>t.side===1 && t.a.x!==1280-140 && t.p<1))
})

test('opposing excavation reveals contact and resolves a contest', () => {
  const g=new Simulation(123)
  g.net.add(0,{x:985,y:245},{x:985,y:370})
  run(g,30)
  assert(g.armies[0].stats.contacts>0)
  assert(g.net.paths.some(t=>t.side===1 && t.seen))
  assert(g.log.some(e=>e.msg.includes('held the junction')))
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

for (const [seed,expected] of [[22,1],[23,0]]) {
  test('full match with seed '+seed+' reaches '+(expected?'defeat':'victory'), () => {
    const g=new Simulation(seed)
    for(let tick=0;tick<12000 && g.winner===null;tick++){
      if(expected===0 && tick%160===0){
        g.recruit(0,'infantry');g.order(0,'advance')
        if(g.armies[0].sup>22)g.ability(0,'reserve',0)
      }
      g.step(.05)
    }
    assert.equal(g.winner,expected)
    assert(g.armies[expected].stats.captures>0)
    assert(g.armies[1].stats.length>0)
    assert(g.armies[1].stats.units>0)
  })
}
