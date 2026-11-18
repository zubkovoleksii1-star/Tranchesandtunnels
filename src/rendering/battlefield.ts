import {Application,Container,Graphics,SCALE_MODES,Sprite,Texture} from 'pixi.js'
import {H,W,distance,type Point,type Side} from '../game/config'
import {tip,type Tunnel} from '../game/tunnels'
import type {Simulation} from '../game/simulation'
import {terrain,land} from './terrain'
import {Troops} from './troops'
import {artillery,casualties,mining,skirmish} from './combat-effects'

export type Camera={x:number;y:number;width:number;height:number}
type Unit=Simulation['units'][number]
const allied=0xc0d49d,enemy=0xf0a58c,amber=0xffcc79

export class Battlefield {
  private app:Application
  private world=new Container()
  private ink=new Graphics()
  private effects=new Graphics()
  private troops=new Troops()
  private drawPixel=(x:number,y:number,width:number,height:number,color:number,alpha=1)=>{
    this.effects.lineStyle(0).beginFill(color,alpha)
      .drawRect(Math.round(x),Math.round(y),Math.max(1,Math.round(width)),Math.max(1,Math.round(height))).endFill()
  }

  constructor(host:HTMLElement){
    this.app=new Application({width:W,height:H,antialias:false,
      resolution:Math.min(window.devicePixelRatio||1,2),autoStart:false,backgroundColor:0x33382e})
    const background=Texture.from(terrain(),{scaleMode:SCALE_MODES.NEAREST})
    this.world.addChild(new Sprite(background),this.ink,this.troops.layer,this.effects)
    this.app.stage.addChild(this.world)
    host.prepend(this.app.view as HTMLCanvasElement)
  }

  draw(s:Simulation,camera:Camera,sketch?:readonly Point[]){
    this.world.scale.set(W/camera.width,H/camera.height)
    this.world.position.set(-camera.x*this.world.scale.x,-camera.y*this.world.scale.y)
    this.ink.clear()
    this.effects.clear()
    this.troops.begin()
    this.burningVillage(s.time)
    this.tunnels(s)
    this.staging(s)
    this.checkpoints(s)
    for(const point of s.net.contacts){
      this.ring(point.x,point.y,15,enemy,2,.4)
      this.ink.lineStyle(2,0xf4b394).beginFill(0x40251d)
        .drawPolygon([point.x,point.y-10,point.x+10,point.y,point.x,point.y+10,point.x-10,point.y]).endFill()
      this.line(point.x,point.y-4,point.x,point.y+1,0xffdeaa,2)
      this.dot(point.x,point.y+4,1,0xffdeaa)
    }

    const route=sketch??s.drawnRoute
    const planned=route.length>0
    if(planned)this.plannedRoute(s.digFace,route,!!sketch)
    this.enemyCrew(s)
    this.digLeader(s,!planned)
    for(const t of s.trenches){
      const x=t.x,y=land(x),color=t.side?enemy:allied
      this.line(x+22,y-7,x+22,y-46,0x242920,3)
      this.ink.lineStyle(1.5,0x282d23).beginFill(color)
        .drawPolygon([x+22,y-45,x+42,y-45,x+37,y-38,x+42,y-32,x+22,y-32]).endFill()
      if(t.fort>0||t.breach>0){
        const highlight=t.breach>0?enemy:amber
        this.ink.lineStyle(2.5,highlight,.95).drawRoundedRect(x-39,y-14,78,32,7)
      }
    }
    casualties(s,this.troops,(x,y,w,h,color,alpha)=>this.rect(x,y,w,h,color,alpha))
    this.formations(s.units,s.time)
    skirmish(s,this.drawPixel)
    artillery(s,this.drawPixel)
    this.troops.end()
    this.app.render()
  }

  private tunnels(game:Simulation){
    const paths=game.net.paths.filter(tunnel=>tunnel.seen&&!tunnel.reusing)
    // Paint the earth walls first so neighboring segments share one open passage.
    for(const tunnel of paths){
      const b=tip(tunnel),color=tunnel.side?0xc08670:0xa1b576
      this.line(tunnel.a.x,tunnel.a.y,b.x,b.y,color,29,.65)
      this.dot(b.x,b.y,14.5,color,.65)
    }
    for(const tunnel of paths){
      const b=tip(tunnel)
      this.line(tunnel.a.x,tunnel.a.y,b.x,b.y,0x1b231b,24)
      this.dot(tunnel.a.x,tunnel.a.y,12,0x1b231b)
      this.dot(b.x,b.y,12,0x1b231b)
    }
    for(const tunnel of paths){
      const b=tip(tunnel),length=distance(tunnel.a,b)
      const angle=Math.atan2(tunnel.b.y-tunnel.a.y,tunnel.b.x-tunnel.a.x)
      for(let i=12;i<length-8;i+=28){
        const x=tunnel.a.x+i*Math.cos(angle),y=tunnel.a.y+i*Math.sin(angle)
        if(Math.abs(Math.cos(angle))>.4){
          this.rect(x-6,y-10,4,20,0x674b35)
          this.rect(x-6,y-10,1,20,0x927149)
          this.rect(x-8,y-11,18,4,0x6a4e37)
          this.rect(x-8,y-11,18,1,0xa88552)
          this.rect(x+8,y-9,2,5,0x825e40)
        }else{
          this.rect(x-7,y,14,3,0x674b35)
          this.rect(x-7,y,14,1,0x927149)
        }
        if(i%56===12)this.lantern(x+4,y-4,game.time+x)
      }
      if(tunnel.blocked){
        this.line(b.x-5,b.y-5,b.x+5,b.y+5,enemy,2)
        this.line(b.x-5,b.y+5,b.x+5,b.y-5,enemy,2)
      }
    }
  }

  private checkpoints(game:Simulation){
    for(const target of game.tunnelTargets(0)){
      const {x,y}=target.point
      const reached=game.tunnelTargetReached(0,target.id)
      const color=reached?allied:amber
      this.dot(x,y,target.radius,color,reached?.13:.055)
      this.ring(x,y,target.radius,color,1.5,reached?.67:.34)
      if(reached){
        this.line(x-7,y,x-2,y+5,color,3)
        this.line(x-2,y+5,x+8,y-6,color,3)
      }else{
        for(const [u,v] of [[-1,0],[1,0],[0,-1],[0,1]]){
          this.line(x+u*(target.radius-5),y+v*(target.radius-5),
            x+u*(target.radius+2),y+v*(target.radius+2),color,2,.67)
        }
      }
    }
  }

  private plannedRoute(face:Point,points:readonly Point[],sketching:boolean){
    const color=sketching?0xffdfa8:amber
    let last=face,phase=0
    for(const point of points){
      if(distance(last,point)<2)continue
      this.line(last.x,last.y,point.x,point.y,0x211c17,5,.83)
      phase=this.dashed(last,point,color,2.5,.97,phase)
      last=point
    }
    if(last===face)return
    this.ring(last.x,last.y,7,0x211c17,3,.9)
    this.ring(last.x,last.y,7,color,1.5)
    this.line(last.x-3,last.y,last.x+3,last.y,color,1.5)
    this.line(last.x,last.y-3,last.x,last.y+3,color,1.5)
  }

  private digLeader(game:Simulation,showArrow:boolean){
    const face=game.digFace,direction=game.digDirection,dig=game.activeDig
    const guidance=dig?.delay?enemy:dig?.reusing?allied:amber
    if(showArrow){
      const flex=dig?distance(face,dig.b):0
      const length=dig?Math.max(11,Math.min(48,flex)):32
      const end={x:face.x+direction.x*length,y:face.y+direction.y*length}
      const start={x:face.x+direction.x*5,y:face.y+direction.y*5}
      const wing={x:-direction.y*5,y:direction.x*5}
      const tail={x:end.x-direction.x*9,y:end.y-direction.y*9}
      this.line(start.x,start.y,end.x,end.y,0x1c211b,6,.7)
      this.dashed(start,end,guidance,2,.93)
      this.ink.lineStyle(1,0x382d1e).beginFill(guidance)
        .drawPolygon([end.x,end.y,tail.x+wing.x,tail.y+wing.y,tail.x-wing.x,tail.y-wing.y]).endFill()
    }
    this.dot(face.x,face.y,13,0xf2ba62,.11)
    this.ring(face.x,face.y,13,guidance,1.6,dig?.delay ? .9 : .65)
    this.dot(face.x,face.y,2.2,0xffe4a4)
    this.crew(game.time,face,direction,0,dig,14)
  }

  private enemyCrew(game:Simulation){
    const dig=game.enemyActiveDig
    // The opposing crew is visible only at a discovered segment.
    if(!dig?.seen)return
    const face=game.enemyDigFace,length=distance(dig.a,dig.b)
    if(length===0)return
    const direction={x:(dig.b.x-dig.a.x)/length,y:(dig.b.y-dig.a.y)/length}
    this.ring(face.x,face.y,11,enemy,1.6,dig.delay ? .8 : .48)
    this.dot(face.x,face.y,2,enemy,.82)
    const separation=Math.min(30,distance(game.digFace,face))
    this.crew(game.time,face,direction,1,dig,13+(30-separation)*.43)
  }

  private crew(time:number,face:Point,direction:Point,side:Side,dig:Tunnel|undefined,gap:number){
    const facing=direction.x<0?-1:1
    const tilt=Math.atan2(direction.y*facing,Math.abs(direction.x))
    const working=!!dig&&!dig.delay&&!dig.reusing
    const x=face.x-direction.x*gap-Math.sin(tilt)*10
    const y=face.y-direction.y*gap+Math.cos(tilt)*10
    this.troops.draw(x,y,side,'engineer',working?Math.floor(time*6)%2:0,1,1.28,tilt,facing)
    if(working)mining(time,face.x,face.y,side,this.drawPixel,direction)
  }

  private burningVillage(time:number){
    // Window embers and wind-blown columns at two of the ruined houses.
    for(const [x,y] of [[456,140],[704,147]]){
      const gust=Math.floor(time*7+x)
      for(let i=0;i<9;i++){
        const p=(time*.105+i/9)%1
        const sx=x+Math.round(p*(31+i%3*3)+Math.sin(i*2+p*5)*3)
        const sy=y-6-Math.round(p*65)
        const w=5+Math.floor(p*17)
        this.rect(sx-w/2,sy,w,5+p*8,0x343f41,(1-p)*.36)
        this.rect(sx-w/2+3,sy-3,w-4,4+p*6,0x596060,(1-p)*.24)
      }
      this.rect(x-3,y-5,11,8,0xd76c3f,.22)
      this.rect(x,y-4,6,6,0xbc5636)
      this.rect(x+1,y-1-(gust%3),2,3+gust%3,0xf2ad60)
      this.rect(x+4,y-2-(gust%4),2,3+gust%4,0xde874c)
      const spark=(time*1.3+x)%1
      this.rect(x+5+Math.round(spark*4),y-6-Math.round(spark*9),2,2,0xe5a266,1-spark)
    }
  }

  private formations(units:Unit[],time:number){
    // Stack nearby squads behind one recognizable silhouette. Pips show
    // concentration where several units occupy the same part of a trench.
    for(const side of [0,1] as Side[]){
      const line=units.filter(u=>u.side===side).sort((a,b)=>a.x-b.x)
      for(let i=0;i<line.length;){
        const first=line[i],group:Unit[]=[]
        do group.push(line[i++])
        while(i<line.length&&line[i].x-first.x<20)
        const x=group.reduce((sum,u)=>sum+u.x,0)/group.length,y=land(x)
        const role=group.some(u=>u.role==='gun')?'gun':'infantry'
        const pose=group.some(u=>u.motion)?1+Math.floor(time*9+first.id)%3:0
        if(group.length>1)this.troops.draw(x+(side?11:-11),y-2,side,'infantry',pose,.72,1.65)
        this.troops.draw(x,y-1,side,role,pose)
        if(group.length<2)continue
        const count=Math.min(group.length,6),left=x-(count-1)*2.7
        this.ink.lineStyle(0).beginFill(0x202720,.92)
          .drawRoundedRect(left-4,y-53,count*5.4+2,8,2).endFill()
        for(let pip=0;pip<count;pip++)this.rect(left+pip*5.4-1,y-50,3,2,side?enemy:allied)
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
    this.lantern(x+13,y-6,s.time)
  }

  private lantern(x:number,y:number,time:number){
    const glow=.16+Math.sin(time*5)*.045
    this.rect(x-7,y-4,15,11,amber,glow*.35)
    this.rect(x-4,y-6,9,14,amber,glow*.35)
    this.rect(x-3,y-3,7,9,0x413025)
    this.rect(x-1,y-5,3,2,0x96683e)
    this.rect(x-2,y-2,5,6,0xdb9251)
    this.rect(x,y-1,2,4,0xffd68a)
    this.rect(x-3,y+4,7,2,0x6a4a31)
  }

  private dashed(a:Point,b:Point,color:number,width:number,alpha:number,phase=0){
    const d=distance(a,b)
    if(d<1)return phase
    const x=(b.x-a.x)/d,y=(b.y-a.y)/d
    for(let i=-phase;i<d;i+=17){
      const start=Math.max(0,i),end=Math.min(i+10,d)
      if(end>start)this.line(a.x+x*start,a.y+y*start,a.x+x*end,a.y+y*end,color,width,alpha)
    }
    return (phase+d)%17
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
