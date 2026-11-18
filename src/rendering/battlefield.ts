import {Application,Container,Graphics,Sprite,Texture} from 'pixi.js'
import {H,W,GROUND,distance,type Point} from '../game/config'
import {tip} from '../game/tunnels'
import type {Simulation} from '../game/simulation'
import {terrain,land} from './terrain'

export type Camera={x:number;y:number;width:number;height:number}
type Route={a:Point;b:Point;via?:Point[]}
type Unit=Simulation['units'][number]
const allied=0xc0d49d,enemy=0xf0a58c,amber=0xffcc79

export class Battlefield {
  private app:Application
  private world=new Container()
  private ink=new Graphics()

  constructor(host:HTMLElement){
    this.app=new Application({width:W,height:H,antialias:true,
      resolution:Math.min(window.devicePixelRatio||1,2),autoStart:false,backgroundColor:0x33382e})
    this.world.addChild(Sprite.from(Texture.from(terrain())),this.ink)
    this.app.stage.addChild(this.world)
    host.prepend(this.app.view as HTMLCanvasElement)
  }

  draw(s:Simulation,selected:number,camera:Camera,route?:Route){
    this.world.scale.set(W/camera.width,H/camera.height)
    this.world.position.set(-camera.x*this.world.scale.x,-camera.y*this.world.scale.y)
    this.ink.clear()
    for(let i=0;i<14;i++){
      const p=(s.time*.07+i*.272)%1,x=(i<7?582:771)+p*48+Math.sin(i*22)*5,y=100-p*68
      this.dot(x,y,4+p*15,0x555e57,(1-p)*.09)
    }
    for(const tunnel of s.net.paths){
      if(!tunnel.seen)continue
      const b=tip(tunnel),d=distance(tunnel.a,b)
      const angle=Math.atan2(tunnel.b.y-tunnel.a.y,tunnel.b.x-tunnel.a.x)
      const active=(tunnel.p<1||tunnel.delay>0)&&!tunnel.blocked
      const color=tunnel.side?0xc08670:0xa1b576
      this.line(tunnel.a.x,tunnel.a.y,b.x,b.y,color,27,.52)
      this.dot(b.x,b.y,13.5,color,.52)
      this.line(tunnel.a.x,tunnel.a.y,b.x,b.y,0x1b231b,22)
      this.dot(b.x,b.y,11,0x1b231b)
      for(let i=12;i<d-9;i+=28){
        const x=tunnel.a.x+i*Math.cos(angle),y=tunnel.a.y+i*Math.sin(angle)
        if(Math.abs(Math.cos(angle))>.4){
          this.line(x-4,y+10,x-5,y-9,0x87724f,3)
          this.line(x-7,y-9,x+9,y-9,0xaa8b58,2)
        }else this.line(x-7,y,x+7,y,0x87724f,2)
        if(i%56===12){
          this.dot(x+4,y-3,8,amber,.16)
          this.rect(x+3,y-5,3,4,amber)
        }
      }
      if(active){
        this.dashed(b,tunnel.b,color,2,.66)
        this.ring(b.x,b.y,13,tunnel.delay>0?enemy:amber,2,.78)
        this.person(b.x,b.y+9,tunnel.side,tunnel.delay>0?0:Math.sin(s.time*8),true)
      }else if(tunnel.blocked){
        this.line(b.x-5,b.y-5,b.x+5,b.y+5,enemy,2)
        this.line(b.x-5,b.y+5,b.x+5,b.y-5,enemy,2)
      }
    }
    this.staging(s)
    if(route){
      const points=[route.a,...(route.via??[]),route.b]
      for(let i=1;i<points.length;i++)this.dashed(points[i-1],points[i],amber,3,.92)
      this.ring(route.a.x,route.a.y,8,amber,2)
      this.ring(route.b.x,route.b.y,10,amber,2)
    }
    for(const point of s.net.contacts){
      this.ring(point.x,point.y,15,enemy,2,.4)
      this.ink.lineStyle(2,0xf4b394).beginFill(0x40251d)
        .drawPolygon([point.x,point.y-10,point.x+10,point.y,point.x,point.y+10,point.x-10,point.y]).endFill()
      this.line(point.x,point.y-4,point.x,point.y+1,0xffdeaa,2)
      this.dot(point.x,point.y+4,1,0xffdeaa)
    }

    for(const [i,t] of s.trenches.entries()){
      const x=t.x,y=land(x),color=t.side?enemy:allied
      this.line(x+22,y-7,x+22,y-46,0x242920,3)
      this.ink.lineStyle(1.5,0x282d23).beginFill(color)
        .drawPolygon([x+22,y-45,x+42,y-45,x+37,y-38,x+42,y-32,x+22,y-32]).endFill()
      if(i===selected||t.fort>0||t.breach>0){
        const highlight=t.breach>0?enemy:t.fort>0?amber:color
        this.ink.lineStyle(2.5,highlight,.95).drawRoundedRect(x-39,y-14,78,32,7)
      }
    }
    this.formations(s.units,s.time)
    for(const f of s.fire){
      this.line(f.x,land(f.x)-14,f.end,land(f.end)-13,0xeec68d,1.4,.6)
      this.dot(f.x,land(f.x)-14,3,0xf8ce8b)
    }
    for(const a of s.suppression.filter(a=>a.time>0)){
      for(let i=0;i<9;i++){
        const f=(s.time*.45+i*.11)%1,x=a.x+Math.sin(i*8)*62
        this.dot(x+f*11,GROUND-9-f*24,5+f*10,0x53574f,(1-f)*.38)
        if(f<.07)this.dot(x,GROUND-8,5,0xf3be6e)
      }
    }
    this.app.render()
  }

  private formations(units:Unit[],time:number){
    // Stack nearby squads behind one recognizable silhouette. Pips show
    // concentration where several units occupy the same part of a trench.
    for(const side of [0,1]){
      const line=units.filter(u=>u.side===side).sort((a,b)=>a.x-b.x)
      for(let i=0;i<line.length;){
        const first=line[i],group:Unit[]=[]
        do group.push(line[i++])
        while(i<line.length&&line[i].x-first.x<20)
        const x=group.reduce((sum,u)=>sum+u.x,0)/group.length,y=land(x)
        const gun=group.some(u=>u.role==='gun')
        const step=group.some(u=>u.motion)?Math.sin(time*9+first.id):0
        if(group.length>1)this.person(x+(side?8:-8),y-5,side,-step,false,false,true)
        this.person(x,y-1,side,step,false,gun)
        if(group.length<2)continue
        const count=Math.min(group.length,6),left=x-(count-1)*2.7
        this.ink.lineStyle(0).beginFill(0x202720,.92)
          .drawRoundedRect(left-4,y-41,count*5.4+2,8,3).endFill()
        for(let pip=0;pip<count;pip++)this.dot(left+pip*5.4,y-37,1.65,side?enemy:allied)
      }
    }
  }

  private staging(s:Simulation){
    const x=232,y=356
    this.ink.lineStyle(3,0x806f50).beginFill(0x1c201a)
      .drawRoundedRect(x-23,y-15,48,30,7).endFill()
    for(const rail of [x-20,x+20])this.rect(rail,y-12,3,24,0x7c6849)
    this.rect(x-20,y-14,43,3,0x9a7c52)
    this.rect(x-20,y+12,42,2,0x584734)
    this.rect(x-14,y+3,9,7,0x625139)
    this.line(x-13,y+4,x-7,y+9,0x8c7150,1)
    for(let j=4;j>0;j--)this.dot(x+12,y-6,j*4,amber,.065)
    this.rect(x+10,y-9,4,5,amber)
    if(s.armies[0].engineers>s.net.active(0).length)this.person(x+2,y+12,0,0,true)
  }

  private person(x:number,y:number,side:number,step:number,engineer=false,gun=false,faded=false){
    const g=this.ink,d=side?-1:1,alpha=faded?.53:1
    const body=engineer?0xb78c55:side?0x966451:0x687c4a
    const helmet=engineer?amber:side?enemy:allied
    const ink=0x252920
    const height=engineer?.78:1
    const v=(z:number)=>y-z*height
    this.line(x-2,v(8),x-5-step*2.2,y,ink,3.6,alpha)
    this.line(x+2,v(8),x+4+step*2.2,y,ink,3.6,alpha)
    g.lineStyle(1.7,ink,alpha).beginFill(body,alpha)
      .drawRoundedRect(x-5,v(21),10,14*height,3).endFill()
    this.rect(x-2,v(24),6,6*height,0xd7b089,alpha)
    g.lineStyle(1.7,ink,alpha).beginFill(helmet,alpha)
      .drawEllipse(x,v(25),6.2,3.9*height).endFill()
    this.line(x-3*d,v(15),x+(gun?18:12)*d,v(engineer?20+step*5:16),ink,gun?3.6:2.7,alpha)
    if(gun){
      this.line(x+11*d,v(15),x+8*d,y,ink,2,alpha)
      this.line(x+11*d,v(15),x+16*d,y,ink,2,alpha)
    }
  }

  private dashed(a:Point,b:Point,color:number,width:number,alpha:number){
    const d=distance(a,b)
    if(d<1)return
    const x=(b.x-a.x)/d,y=(b.y-a.y)/d
    for(let i=0;i<d;i+=17){
      const end=Math.min(i+10,d)
      this.line(a.x+x*i,a.y+y*i,a.x+x*end,a.y+y*end,color,width,alpha)
    }
  }

  private line(x:number,y:number,b:number,c:number,color:number,width:number,alpha=1){
    this.ink.lineStyle(width,color,alpha).moveTo(x,y).lineTo(b,c)
  }
  private rect(x:number,y:number,w:number,h:number,color:number,alpha=1){
    this.ink.lineStyle(0).beginFill(color,alpha).drawRect(x,y,w,h).endFill()
  }
  private dot(x:number,y:number,r:number,color:number,alpha=1){
    this.ink.lineStyle(0).beginFill(color,alpha).drawCircle(x,y,r).endFill()
  }
  private ring(x:number,y:number,r:number,color:number,w:number,alpha=1){
    this.ink.lineStyle(w,color,alpha).drawCircle(x,y,r)
  }
}
