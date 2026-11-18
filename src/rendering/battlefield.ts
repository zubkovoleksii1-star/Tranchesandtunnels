import {Application,Graphics,Sprite,Texture} from 'pixi.js'
import {H,W,GROUND,distance,type Point} from '../game/config'
import {tip} from '../game/tunnels'
import type {Simulation} from '../game/simulation'
import {terrain,land} from './terrain'
export class Battlefield {
  app:Application;ink=new Graphics()
  constructor(host:HTMLElement){
    this.app=new Application({width:W,height:H,antialias:true,resolution:1,autoStart:false,backgroundColor:0x33382e})
    this.app.stage.addChild(Sprite.from(Texture.from(terrain())),this.ink)
    host.prepend(this.app.view as HTMLCanvasElement)
  }
  draw(s:Simulation,selected:number,anchor?:Point,hover?:Point){
    const g=this.ink;g.clear()
    const line=(x:number,y:number,a:number,b:number,c:number,w=1,alpha=1)=>g.lineStyle(w,c,alpha).moveTo(x,y).lineTo(a,b)
    const rect=(x:number,y:number,w:number,h:number,c:number,alpha=1)=>g.lineStyle(0).beginFill(c,alpha).drawRect(x,y,w,h).endFill()
    const dot=(x:number,y:number,r:number,c:number,alpha=1)=>g.lineStyle(0).beginFill(c,alpha).drawCircle(x,y,r).endFill()
    for(let i=0;i<14;i++){
      const p=((s.time*.07+i*.272)%1),x=(i<7?582:771)+p*48+Math.sin(i*22)*5,y=100-p*68
      dot(x,y,4+p*15,0x555e57,(1-p)*.09)
    }
    for(const t of s.net.paths.filter(t=>t.seen)){
      const b=tip(t),d=distance(t.a,b),angle=Math.atan2(b.y-t.a.y,b.x-t.a.x)
      for(const [w,c] of [[24,0x60523d],[20,0x151a16],[12,0x20221a]]){line(t.a.x,t.a.y,b.x,b.y,c,w);dot(b.x,b.y,w/2,c)}
      for(let i=9;i<d-5;i+=24){const x=t.a.x+i*Math.cos(angle),y=t.a.y+i*Math.sin(angle)
        if(Math.abs(Math.cos(angle))>.4){line(x-3,y+9,x-4,y-8,0x594b34,3);line(x-6,y-8,x+8,y-8,0x756045,2)}
        else line(x-5,y,x+5,y,0x66573e,2)
        if(i%72===9){for(let j=3;j>0;j--)dot(x+3,y-3,j*4,0xdfa747,.055);rect(x+2,y-5,3,4,0xe9b35c)}
      }
      if(t.p<1&&!t.blocked){this.person(b.x,b.y+6,t.side,Math.sin(s.time*8),true);for(let i=0;i<3;i++)dot(b.x+5+i*1.3,b.y+(i+s.time*6)%8,1,0xaa8860)}
      if(t.side===0&&t.p===1){g.lineStyle(1,0x9caa85,.8).beginFill(0x303a2b).drawCircle(b.x,b.y,4).endFill()}
    }
    // A lamp-lit staging chamber at the lower end of the allied access passage.
    const cx=232,cy=356
    g.lineStyle(3,0x68583f).beginFill(0x1c201a).drawRoundedRect(cx-22,cy-13,47,27,7).endFill()
    for(const x of [cx-18,cx+20])rect(x,cy-11,3,23,0x645037)
    rect(cx-20,cy-12,43,3,0x796448);rect(cx-20,cy+10,42,2,0x584734)
    rect(cx-13,cy+3,9,7,0x625139);line(cx-12,cy+4,cx-6,cy+9,0x8c7150)
    for(let j=4;j>0;j--)dot(cx+10,cy-5,j*4,0xf1b15b,.065)
    rect(cx+8,cy-8,4,5,0xe1ad65)
    if(s.armies[0].engineers>s.net.active(0).length)this.person(cx,cy+9,0,0,true)
    for(const [i,t] of s.trenches.entries()){
      const c=t.side?0xb58172:0xaebc8c,x=t.x,y=land(x)
      line(x+20,y-7,x+20,y-33,0x363a30,2);g.lineStyle(0).beginFill(c).drawPolygon([x+21,y-32,x+35,y-30,x+32,y-26,x+21,y-27]).endFill()
      if(i===selected||t.fort>0)line(x-27,y+16,x+27,y+16,t.fort>0?0xf3c27d:0xb5c099,2,.85)
    }
    for(const u of s.units){const y=land(u.x)-1-(u.id%3)*2;this.person(u.x,y,u.side,u.motion?Math.sin(s.time*9+u.id):0,false,u.role==='gun')}
    for(const f of s.fire){line(f.x,land(f.x)-9,f.end,land(f.end)-8,0xeec68d,1,.48);dot(f.x,land(f.x)-9,2,0xf8ce8b)}
    for(const a of s.suppression.filter(a=>a.time>0))for(let i=0;i<9;i++){const f=(s.time*.45+i*.11)%1;dot(a.x+Math.sin(i*8)*62+f*11,GROUND-9-f*24,5+f*10,0x53574f,(1-f)*.38);if(f<.07)dot(a.x+Math.sin(i*8)*62,GROUND-8,5,0xf3be6e)}
    if(anchor){dot(anchor.x,anchor.y,7,0xdabb7d,.6);if(hover){const c=s.net.validate(0,anchor,hover)?0xd98272:0xc4ce9e;line(anchor.x,anchor.y,hover.x,hover.y,c,1,.9);g.lineStyle(1,c).drawCircle(hover.x,hover.y,6)}}
    this.app.render()
  }
  person(x:number,y:number,side:number,step:number,eng=false,gun=false){
    const g=this.ink,d=side?-1:1
    g.lineStyle(2,0x2c3028).moveTo(x-1,y-4).lineTo(x-2-step*1.6,y).moveTo(x+1,y-4).lineTo(x+2+step*1.6,y)
    g.lineStyle(0).beginFill(side?0x55594f:0x505841).drawRect(x-2.3,y-10,5,7).endFill().beginFill(0xb29c78).drawRect(x-1.6,y-13,3.5,3.8).endFill().beginFill(side?0x454c49:0x47523b).drawEllipse(x,y-13,3.3,2.1).endFill()
    g.lineStyle(gun?2:1.4,0x30332a).moveTo(x-2*d,y-7).lineTo(x+(eng?7:gun?12:8)*d,y-(eng?10+step*4:8))
  }
}
