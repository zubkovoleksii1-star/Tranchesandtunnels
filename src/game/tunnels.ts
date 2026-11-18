import {distance,GROUND,H,rules,W,type Point,type Side} from './config'
export type TunnelTargetId = 'front' | 'rear' | 'hq'
export interface Tunnel {a:Point;b:Point;p:number;side:Side;seen:boolean;blocked:boolean;delay:number;target?:TunnelTargetId}
export const tip=(t:Tunnel):Point=>({x:t.a.x+(t.b.x-t.a.x)*t.p,y:t.a.y+(t.b.y-t.a.y)*t.p})
export function nearest(p:Point,a:Point,b:Point):Point {
  const dx=b.x-a.x,dy=b.y-a.y
  const f=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)))
  return {x:a.x+dx*f,y:a.y+dy*f}
}
export class Network {
  paths:Tunnel[]=[]
  contacts:Point[]=[]
  private encounters=new WeakMap<Tunnel,Point[]>()
  constructor(){
    for(const side of [0,1] as Side[]){
      const mirror=(x:number)=>side?W-x:x
      let a={x:mirror(140),y:GROUND}
      for(const [x,y] of [[140,292],[267,292],[315,330]]){
        const b={x:mirror(x),y}
        this.paths.push({a,b,p:1,side,seen:!side,blocked:false,delay:0});a=b
      }
      this.paths.push({a:{x:mirror(197),y:292},b:{x:mirror(229),y:359},p:1,side,seen:!side,blocked:false,delay:0})
    }
  }
  anchor(side:Side,p:Point,r=22){
    let best:Point|undefined
    for(const t of this.paths.filter(t=>t.side===side)){
      const q=nearest(p,t.a,tip(t)),d=distance(p,q)
      if(d<=r){best=q;r=d}
    }
    return best
  }
  validate(side:Side,a:Point,b:Point){
    if(!this.anchor(side,a,1))return 'Select a connected tunnel first.'
    if(b.y<GROUND+36||b.y>H-18||b.x<20||b.x>W-20)return 'Keep the destination underground.'
    const d=distance(a,b)
    if(d<28||d>225)return 'Choose a point 28–225 map units away.'
    if(this.anchor(side,b,16))return 'This destination is already excavated.'
    return ''
  }
  active(side:Side){return this.paths.filter(t=>t.side===side&&!t.blocked&&(t.p<1||t.delay>0))}
  add(side:Side,a:Point,b:Point,target?:TunnelTargetId){
    const tunnel={a,b,p:0,side,seen:!side,blocked:false,delay:0,target}
    this.paths.push(tunnel)
    return tunnel
  }
  tick(dt:number,side:Side,pay:(cost:number)=>boolean,contest:(t:Tunnel,other:Tunnel)=>boolean,progress:(d:number)=>void){
    for(const t of this.active(side)){
      if(t.delay>0){t.delay=Math.max(0,t.delay-dt);continue}
      if(!t.target&&!pay(dt*rules.digCost))continue
      const length=distance(t.a,t.b),before=t.p
      const speed=t.target?rules.guidedDig.speed:rules.digRate
      t.p=Math.min(1,t.p+dt*speed/length);progress((t.p-before)*length)
      const face=tip(t)
      for(const other of this.paths.filter(o=>o.side!==side)){
        const d=distance(face,nearest(face,other.a,tip(other)))
        if(d<55){other.seen=true;t.seen=true}
        if(d>12)continue
        const encounters=this.encounters.get(t)??[]
        if(encounters.some(c=>distance(c,face)<40))continue
        encounters.push(face);this.encounters.set(t,encounters)
        const opposition=this.encounters.get(other)??[]
        opposition.push(face);this.encounters.set(other,opposition)
        if(!this.contacts.some(c=>distance(c,face)<40))this.contacts.push(face)
        t.delay=4
        if(contest(t,other)){if(other.p<1)other.blocked=true}
        else t.blocked=true
        break
      }
    }
  }
}
