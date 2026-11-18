import {generator, type Point, type Side} from '../game/config'
import type {Simulation} from '../game/simulation'
import {land} from './terrain'
import type {Troops} from './troops'

type Pixel=(x:number,y:number,width:number,height:number,color:number,alpha?:number)=>void

// Render settling bodies and the most recent stains from the simulation history.
export function casualties(game:Simulation, troops:Troops, pixel:Pixel){
  for(const body of game.casualties){
    const elapsed=game.time-body.time
    const age=Math.min(1,elapsed/.45)
    const x=body.x+(body.seed%7-3)
    const y=land(body.x)+2+body.seed%3
    const spread=Math.min(1,(elapsed+.12)/1.8)
    const width=(12+body.seed%12)*spread
    const fresh=elapsed<25
    pixel(x-width*.8,y-1,width*1.8,4,0x48212a,.96)
    pixel(x-width*.64,y,width*1.4,3,fresh?0x9b303c:0x6c2934,.97)
    pixel(x+width*.2,y+3,width*.55,2,fresh?0x882936:0x5d2531,.9)
    pixel(x+width*1.15,y+1,3,2,fresh?0xb14849:0x6f303a,.95)
    if(age<.72){
      const fall=Math.min(1,age/.72)
      troops.draw(x+(body.side?-1:1)*fall*8,y,body.side,'infantry',0,.94,1.6,fall*(body.side?-1:1)*1.42)
      continue
    }
    troops.draw(x,y+1,body.side,'fallen',0,.88,1.45)
  }
}

function flash(pixel:Pixel,x:number,y:number,color:number){
  pixel(x-5,y-1,11,2,color,.92)
  pixel(x-2,y-4,4,8,color,.88)
  pixel(x-1,y-1,3,3,0xffedd2)
  pixel(x+5,y-3,2,2,0xc38248,.8)
}

export function skirmish(game:Simulation,pixel:Pixel){
  for(const f of game.fire){
    const direction=f.side?-1:1
    const muzzle=f.x+direction*(f.role==='gun'?33:28)
    const y=land(f.x)-24
    const travel=f.end-muzzle
    for(let step=1;step<8;step++){
      const x=muzzle+travel*step/8
      pixel(x,y+(step%3===0?1:0),Math.min(7,Math.abs(travel)/12),1,0xeeb970,.56)
    }
    flash(pixel,muzzle,y,0xf8bd72)
  }
  for(const hit of game.impacts){
    const elapsed=.45-hit.life
    const random=generator(hit.seed)
    const facing=hit.side?1:-1
    const hp=land(hit.x)
    for(let i=0;i<(hit.killed?17:8);i++){
      const velocity=18+random()*74
      const lift=12+random()*45
      const x=hit.x+velocity*elapsed*facing
      const y=Math.min(hp,hp-20-lift*elapsed+230*elapsed*elapsed)
      const size=i%4===0?4:2
      pixel(x,y,size,size,i%3===0?0xc34346:0x8f2536,Math.min(1,hit.life*4))
    }
  }
}

const dust=[0x82766b,0x726557,0x60584f,0x4f4e45,0x4d514b]
export function artillery(game:Simulation,pixel:Pixel){
  for(const shell of game.suppression){
    if(shell.time<=0)continue
    for(let i=0;i<5;i++){
      const phase=(game.time*.62+i*.377)%1
      const x=shell.x+Math.cos(i*5.1)*83
      const y=land(x)
      if(phase<.075)flash(pixel,x,y-3,0xf2a65d)
      const spread=4+phase*18
      const alpha=(1-phase)*.75
      for(let puff=0;puff<8;puff++){
        const dx=Math.sin(i+puff*2.3)*spread
        const dy=Math.cos(puff*3.9)*spread*.28
        const size=3+(puff%3)+phase*6
        pixel(x+dx-phase*4,y-4-phase*41+dy,size,size,dust[puff%dust.length],alpha)
      }
      if(phase>.58)continue
      for(let rock=0;rock<5;rock++){
        const drift=Math.sin(i+rock*2.6)
        const lift=7+rock*4
        pixel(x+phase*drift*92,y-4*lift*phase*(1-phase),rock%2?3:2,2,0x544234,alpha)
      }
    }
  }
}

export function mining(time:number,x:number,y:number,side:Side,pixel:Pixel,direction:Point={x:side?-1:1,y:0}){
  for(let i=0;i<8;i++){
    const phase=(time*2.9+i*.289)%1
    const drift=3+Math.sin(i*2.6)*10
    const reach=6+phase*drift
    pixel(x+direction.x*reach,y+direction.y*reach-6-phase*13+phase*phase*24,
      i%3===0?3:2,2,i%2===0?0x9e8051:0x574133,1-phase)
  }
}
