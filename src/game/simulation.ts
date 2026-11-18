import {HQ, generator, rules, type Role,type Side,type Ability,type Point} from './config'
import {Network,tip} from './tunnels'
type Soldier={side:Side;role:'infantry'|'gun';x:number;hp:number;morale:number;reload:number;id:number;motion:boolean}
const army=()=>({mp:48,sup:35,hp:100,engineers:1,goal:0,stance:'hold',cd:{reserve:0,shell:0,fort:0},boost:0,stats:{units:0,captures:0,length:0,contacts:0}})
export class Simulation {
  random:()=>number
  time=0; nextAI=5; winner:Side|null=null; serial=0
  armies=[army(),army()];units:Soldier[]=[];net=new Network()
  trenches=[145,345,935,1135].map((x,i)=>({x,side:(i<2?0:1) as Side,fort:0}))
  fire:{x:number,end:number,life:number}[]=[]
  suppression=[{x:0,time:0},{x:0,time:0}]
  log:{time:number,msg:string}[]=[]
  constructor(seed:number){
    this.random=generator(seed)
    for(const s of [0,1] as Side[]){
      this.armies[s].goal=this.trenches[s?2:1].x
      for(let i=0;i<5;i++)this.spawn(s,'infantry',this.trenches[s?2:1].x+(s?1:-1)*(i*13+3))
    }
    this.report('Command link established. Both lines are holding.')
  }
  report(msg:string){this.log.unshift({time:this.time,msg});this.log.length=Math.min(this.log.length,32)}
  spawn(side:Side,role:'infantry'|'gun',x:number){
    this.units.push({side,role,x,hp:role==='gun'?130:100,morale:1,reload:this.random()*2,id:this.serial++,motion:false})
  }
  recruit(s:Side,r:Role){
    const a=this.armies[s],[mp,sup]=rules.recruits[r]
    if(a.mp<mp||a.sup<sup)return 'Insufficient resources.'
    a.mp-=mp;a.sup-=sup;a.stats.units++
    if(r==='engineer')a.engineers++;else this.spawn(s,r,HQ[s])
    if(!s)this.report(({infantry:'Infantry squad deployed.',gun:'Machine gun team deployed.',engineer:'Engineer team ready.'})[r])
    return ''
  }
  order(s:Side,stance:string,index?:number){
    const a=this.armies[s]
    if(stance==='hold'&&(index===undefined||this.trenches[index].side!==s))return 'Select a friendly trench.'
    a.stance=stance
    a.goal=stance==='advance'?HQ[1-s]:stance==='retreat'?this.trenches[s?3:0].x:this.trenches[index!].x
    if(!s)this.report(stance==='advance'?'Surface units advancing.':stance==='retreat'?'Falling back to the rear line.':'Units reinforcing the selected trench.')
    return ''
  }
  ability(s:Side,k:Ability,index:number){
    const a=this.armies[s],[cost,cd,duration]=rules.powers[k],t=this.trenches[index]
    if(k==='fort'&&t.side!==s)return 'Select a friendly trench.'
    if(a.cd[k]>0)return 'Ability recharging.'
    if(a.sup<cost)return 'Insufficient supplies.'
    a.sup-=cost;a.cd[k]=cd
    if(k==='reserve')a.boost=duration
    if(k==='fort')t.fort=duration
    if(k==='shell')this.suppression[1-s]={x:t.x,time:duration}
    this.report((s?'Enemy ':'Allied ')+({reserve:'reserves mobilized.',fort:'trench fortified.',shell:'artillery suppression active.'})[k]);return ''
  }
  dig(s:Side,a:Point,b:Point){
    const error=this.net.validate(s,a,b),army=this.armies[s]
    if(error)return error
    if(this.net.active(s).length>=army.engineers)return 'All engineers are busy.'
    if(army.sup<rules.orderCost)return 'Insufficient supplies.'
    army.sup-=rules.orderCost;this.net.add(s,a,b)
    if(!s)this.report('Engineers breaking ground.')
    return ''
  }
  step(dt:number){
    if(this.winner!==null)return
    this.time+=dt
    this.fire=this.fire.filter(f=>(f.life-=dt)>0)
    for(const t of this.trenches)t.fort=Math.max(0,t.fort-dt)
    for(const s of [0,1] as Side[]){
      const a=this.armies[s];a.mp+=rules.income[0]*dt*(a.boost>0?3:1);a.sup+=rules.income[1]*dt
      a.boost-=dt;this.suppression[s].time-=dt
      for(const k of ['reserve','shell','fort'] as Ability[])a.cd[k]=Math.max(0,a.cd[k]-dt)
      this.net.tick(dt,s,c=>{if(a.sup<c)return false;a.sup-=c;return true},(t,o)=>{
        const strength=(side:Side)=>{const units=this.units.filter(u=>u.side===side);return Math.min(4,this.armies[side].engineers)+units.reduce((v,u)=>v+u.morale,0)/(units.length||1)+this.random()*2}
        const win=strength(s)>=strength(o.side)
        this.armies.forEach(a=>a.stats.contacts++);this.report('Tunnel contact! '+((win?s:o.side)===0?'Allied':'Enemy')+' engineers held the junction.')
        t.seen=o.seen=true;this.nextAI=Math.min(this.nextAI,this.time+1);return win
      },d=>a.stats.length+=d)
      if(this.net.paths.some(t=>t.side===s&&Math.abs(tip(t).x-HQ[1-s])<60))this.armies[1-s].hp-=dt*.65
    }
    this.combat(dt)
    if(this.time>=this.nextAI)this.ai()
    // Late-match supply attrition resolves a prolonged stalemate.
    if(this.time>420)for(const s of [0,1] as Side[]){
      const occupied=this.trenches.filter(t=>t.side===s).length
      this.armies[s].hp-=dt*(0.7+(4-occupied)*0.18)
    }
    if(this.armies.some(a=>a.hp<=0))this.winner=this.armies[0].hp===this.armies[1].hp?(this.units.filter(u=>u.side===0).length>=this.units.filter(u=>u.side===1).length?0:1):this.armies[0].hp>this.armies[1].hp?0:1
  }
  combat(dt:number){
    for(const u of this.units){
      if(u.hp<=0)continue
      const army=this.armies[u.side],enemy=(1-u.side) as Side,range=rules.range[u.role]
      let best=range,target:Soldier|undefined
      for(const e of this.units){const d=Math.abs(e.x-u.x);if(e.side!==u.side&&e.hp>0&&d<best){target=e;best=d}}
      const trench=this.trenches.find(t=>Math.abs(t.x-u.x)<40&&t.side===u.side)
      u.reload-=dt;u.motion=false
      const shell=this.suppression[u.side],under=shell.time>0&&Math.abs(shell.x-u.x)<165
      u.morale=Math.max(.45,Math.min(1,u.morale+dt*(under?-.15:.035)))
      if(target&&army.stance!=='retreat'){
        if(u.reload<=0){
          const cover=this.trenches.find(t=>t.side===enemy&&Math.abs(t.x-target!.x)<40)
          target.hp-=(u.role==='gun'?(trench?24:16):12)*u.morale*(cover?(cover.fort>0?.28:.55):1)
          u.reload=(1.4+this.random())*(under?1.8:1)
          this.fire.push({x:u.x,end:target.x,life:.13})
        }
      }else{
        const offset=(u.id%7)*4*(u.side?1:-1)
        const dx=army.goal+offset-u.x,move=rules.speed[u.role]*dt
        u.motion=Math.abs(dx)>1;u.x+=Math.sign(dx)*Math.min(Math.abs(dx),move)
      }
      if(Math.abs(u.x-HQ[enemy])<52)this.armies[enemy].hp-=dt*.14
      for(const t of this.trenches)if(t.side!==u.side&&Math.abs(u.x-t.x)<20&&!this.units.some(e=>e.side===enemy&&e.hp>0&&Math.abs(e.x-t.x)<42)){
        t.side=u.side;t.fort=0;army.stats.captures++;this.report((u.side?'Enemy':'Allies')+' captured trench '+(this.trenches.indexOf(t)+1)+'.')
      }
    }
    this.units=this.units.filter(u=>u.hp>0)
  }
  ai(){
    const r=this.random,a=this.armies[1],front=this.units.filter(u=>!u.side).sort((a,b)=>b.x-a.x)[0],threat=(front?.x??0)>810
    const index=this.trenches.findIndex(t=>t.side===1),own=this.units.filter(u=>u.side===1).length
    if(this.net.contacts.length&&a.engineers<3&&r()<.55)this.recruit(1,'engineer')
    else if(r()<.85)this.recruit(1,r()<.24?'gun':r()<.16&&a.engineers<3?'engineer':'infantry')
    if(threat&&index>=0&&r()<.55){this.order(1,'hold',index);this.ability(1,'fort',index)}
    else if(own>=5&&(r()<.35||this.time>220))this.order(1,'advance')
    if(r()<.24)this.ability(1,'reserve',2)
    if(front&&r()<.34){const closest=this.trenches.reduce((a,b)=>Math.abs(a.x-front.x)<Math.abs(b.x-front.x)?a:b);this.ability(1,'shell',this.trenches.indexOf(closest))}
    if(this.net.active(1).length<a.engineers){
      const candidates=this.net.paths.filter(t=>t.side===1&&t.p===1).sort((a,b)=>a.b.x-b.b.x)
      const start=candidates[r()<.83?0:Math.floor(r()*candidates.length)].b
      this.dig(1,start,{x:Math.max(40,start.x-95-r()*105),y:270+r()*105})
    }
    this.nextAI=this.time+7+r()*10
  }
}
