import {HQ, distance, generator, rules, type Role,type Side,type Ability,type Point} from './config'
import {Network,nearest,tip,type TunnelTargetId} from './tunnels'
import {ExcavationCrew,type DigHeading} from './crew'
export type {TunnelTargetId} from './tunnels'
export type {DigHeading} from './crew'
type Soldier={side:Side;role:'infantry'|'gun';x:number;hp:number;morale:number;reload:number;id:number;motion:boolean}
type SurfaceCasualty={x:number;side:Side;seed:number;time:number}
type CombatImpact=SurfaceCasualty&{killed:boolean;life:number}
const MAX_COMBAT_EFFECTS=128
const MAX_CASUALTIES=96
type CrewBot={depthBias:number;period:number;next:number;target?:TunnelTargetId;detour?:{depth:number;until:number}}
function crewRandom(seed:number,salt:number){
  const mixed=Math.imul(seed^salt,0x7feb352d)
  return generator(Math.imul(mixed^(mixed>>>16),0x846ca68b))
}
const army=()=>({mp:48,sup:35,hp:100,engineers:1,goal:0,stance:'hold',cd:{reserve:0,shell:0,fort:0},boost:0,stats:{units:0,captures:0,length:0,contacts:0}})
export class Simulation {
  random:()=>number
  time=0; nextAI=5; winner:Side|null=null; serial=0
  armies=[army(),army()];units:Soldier[]=[];net=new Network()
  trenches=[145,345,935,1135].map((x,i)=>({x,side:(i<2?0:1) as Side,fort:0,breach:0}))
  private reachedTargets:[Set<TunnelTargetId>,Set<TunnelTargetId>]=[new Set(),new Set()]
  private crews:[ExcavationCrew,ExcavationCrew]
  private bots:[CrewBot,CrewBot]
  autoSteer=true
  private manualRouteActive=false
  private nextAlliedRecruit=rules.autoSurface.firstRecruit
  fire:{x:number;end:number;life:number;side:Side;role:Soldier['role']}[]=[]
  impacts:CombatImpact[]=[]
  casualties:SurfaceCasualty[]=[]
  private impactSerial=0
  suppression=[{x:0,time:0},{x:0,time:0}]
  log:{time:number,msg:string}[]=[]
  constructor(seed:number){
    this.random=generator(seed)
    const alliedRandom=crewRandom(seed,0x9e3779b1),enemyRandom=crewRandom(seed,0x85ebca6b)
    const crewSpeed=(random:()=>number)=>rules.autoDig.speed*(0.91+random()*0.18)
    const crewBot=(random:()=>number):CrewBot=>({depthBias:(random()-.5)*37,period:0.28+random()*.37,next:0})
    this.crews=[new ExcavationCrew(0,this.net,crewSpeed(alliedRandom)),new ExcavationCrew(1,this.net,crewSpeed(enemyRandom))]
    this.bots=[crewBot(alliedRandom),crewBot(enemyRandom)]
    for(const s of [0,1] as Side[]){
      this.armies[s].goal=this.trenches[s?2:1].x
      for(let i=0;i<5;i++)this.spawn(s,'infantry',this.trenches[s?2:1].x+(s?1:-1)*(i*13+3))
    }
    this.armies[0].stance='advance'
    this.armies[0].goal=HQ[1]
    this.updateCrews()
    this.report('Пехота наступает. Инженеры начали проходку.')
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
  ability(s:Side,k:Ability,index:number,center?:number){
    const a=this.armies[s],[cost,cd,duration]=rules.powers[k],t=this.trenches[index]
    if(k==='fort'&&t.side!==s)return 'Select a friendly trench.'
    if(a.cd[k]>0)return 'Ability recharging.'
    if(a.sup<cost)return 'Insufficient supplies.'
    a.sup-=cost;a.cd[k]=cd
    if(k==='reserve')a.boost=duration
    if(k==='fort')t.fort=duration
    if(k==='shell')this.suppression[1-s]={x:center??t.x,time:duration}
    this.report((s?'Enemy ':'Allied ')+({reserve:'reserves mobilized.',fort:'trench fortified.',shell:'artillery suppression active.'})[k]);return ''
  }
  get heading(){return this.crews[0].heading}
  get digFace(){return this.crews[0].face}
  get activeDig(){return this.crews[0].active}
  get digDirection(){return this.crews[0].direction}
  get enemyDigFace(){return this.crews[1].face}
  get enemyActiveDig(){return this.crews[1].active}
  get drawnRoute():readonly Point[]{return this.crews[0].route}
  get digStatus():string{
    const current=this.activeDig
    if(!current)return 'Инженеры намечают новый ход'
    if(current.delay>0)return 'Подземный контакт · пауза '+Math.ceil(current.delay)+' с'
    if(current.reusing)return 'Переход по готовому тоннелю'
    if(this.drawnRoute.length)return 'Проходка по вашему маршруту'
    return 'Проходка к цели'
  }
  botTarget(side:Side){return this.bots[side].target}
  setAutoSteer(enabled:boolean){
    if(this.winner!==null)return
    this.autoSteer=enabled
    if(enabled){
      this.crews[0].clearRoute()
      this.manualRouteActive=false
      this.bots[0].next=this.time
      this.updateCrews()
    }
  }
  setHeading(heading:DigHeading){
    if(this.autoSteer||this.winner!==null)return
    const crew=this.crews[0]
    crew.clearRoute()
    this.manualRouteActive=false
    crew.heading=heading
    crew.continue()
  }
  setDrawnRoute(points:readonly Point[]){
    if(this.winner!==null||!this.crews[0].replaceRoute(points))return false
    this.autoSteer=false
    this.manualRouteActive=true
    return true
  }
  private updateCrews(){
    this.crews[0].consumeWaypoint()
    if(this.manualRouteActive&&!this.drawnRoute.length){
      this.autoSteer=true
      this.manualRouteActive=false
      this.bots[0].next=this.time
    }
    for(const side of [0,1] as Side[]){
      if(side===1||this.autoSteer)this.steerCrew(side)
      this.crews[side].continue()
    }
  }
  private steerCrew(side:Side){
    const bot=this.bots[side],crew=this.crews[side],face=crew.face
    if(bot.next>this.time||crew.active?.delay)return
    bot.next=this.time+bot.period
    const goals=this.tunnelTargets(side)
    const available=goals.filter(({id})=>!this.tunnelTargetReached(side,id))
    const target=available.find(({id})=>id===bot.target)??available[0]
    if(bot.target!==target?.id)bot.detour=undefined
    bot.target=target?.id
    if(!target)return

    const dx=target.point.x-face.x
    if(Math.abs(dx)>target.radius*.65)crew.travel=Math.sign(dx)
    let depth=target.point.y+bot.depthBias*Math.min(1,Math.abs(dx)/125)

    // Give discovered passages room when travelling at a similar depth far from the target.
    if(Math.abs(dx)<=105||bot.detour&&this.time>=bot.detour.until)bot.detour=undefined
    if(!bot.detour&&Math.abs(depth-face.y)<6&&Math.abs(dx)>105){
      const ahead={x:face.x+crew.travel*40,y:face.y}
      const crossing=this.net.paths.find(path=>path.side!==side&&path.observed&&
        distance(nearest(ahead,path.a,tip(path)),ahead)<15)
      if(crossing)bot.detour={depth:face.y+(bot.depthBias<0?-36:36),until:this.time+24}
    }
    if(bot.detour)depth=bot.detour.depth
    const dy=depth-face.y
    crew.heading=Math.abs(dy)<5?'straight':dy<0?'up':'down'
  }
  private recruitAlliedSurface(){
    if(this.time<this.nextAlliedRecruit)return
    this.nextAlliedRecruit=this.time+rules.autoSurface.recruitInterval
    const guns=this.units.filter(unit=>unit.side===0&&unit.role==='gun').length
    if(this.time<=25||guns>=rules.autoSurface.maxGuns||this.recruit(0,'gun'))this.recruit(0,'infantry')
    const army=this.armies[0]
    if(army.mp<23&&army.sup>=rules.powers.reserve[0])this.ability(0,'reserve',1)
    const front=this.units.find(unit=>unit.side===1&&this.units.some(ally=>ally.side===0&&Math.abs(ally.x-unit.x)<110))
    if(front)this.ability(0,'shell',1,front.x)
  }
  tunnelTargets(side:Side){
    const {breachSeconds,hqDamage}=rules.breakthrough
    const front=side?1:2,rear=side?0:3
    const trenchEffect='Лишает защитников укрытия на '+breachSeconds+' сек.'
    const targets=[
      {id:'front',label:'Передовой окоп',point:{x:this.trenches[front].x,y:286},effect:trenchEffect,trench:front,radius:rules.autoDig.targetRadius},
      {id:'rear',label:'Тыловой окоп',point:{x:this.trenches[rear].x,y:260},effect:trenchEffect,trench:rear,radius:rules.autoDig.targetRadius},
      {id:'hq',label:'Штаб',point:{x:HQ[1-side],y:300},effect:'Снижает прочность штаба на '+hqDamage+' пунктов.',trench:null,radius:rules.autoDig.targetRadius}
    ] as const
    return targets
  }
  tunnelTargetReached(side:Side,id:TunnelTargetId){
    return this.reachedTargets[side].has(id)
  }
  private applyTunnelReward(side:Side,id:TunnelTargetId){
    if(this.tunnelTargetReached(side,id))return
    this.reachedTargets[side].add(id)
    const {breachSeconds,hqDamage}=rules.breakthrough
    const target=this.tunnelTargets(side).find(target=>target.id===id)!
    if(target.trench===null){
      this.armies[1-side].hp-=hqDamage
      this.report(side===0?'Подземный прорыв снизил прочность штаба противника на '+hqDamage+' пунктов.':'Противник прорвался к нашему штабу. Потеряно '+hqDamage+' пунктов прочности.')
      return
    }
    const trench=this.trenches[target.trench]
    if(trench.side===side){
      if(side===0)this.report('Проложен ход к уже занятому окопу.')
      return
    }
    trench.breach=breachSeconds
    this.report(side===0?target.label+' противника потерял укрытие на '+breachSeconds+' сек.':'Противник вышел к нашему окопу из-под земли. Укрытие ослаблено на '+breachSeconds+' сек.')
  }
  private resolveTunnelOperations(){
    for(const side of [0,1] as Side[]){
      const crew=this.crews[side],tunnel=crew.segment
      if(!tunnel||tunnel.delay>0)continue
      const face=crew.face,targets=this.tunnelTargets(side)
      for(const target of targets){
        if(distance(nearest(target.point,tunnel.a,face),target.point)<=target.radius)this.applyTunnelReward(side,target.id)
      }
      if(this.reachedTargets[side].size===targets.length){
        this.armies[1-side].hp=0
        this.winner=side
        this.report(side===0?'Три подземные цели достигнуты. Штаб противника пал.':'Противник достиг всех подземных целей. Наш штаб пал.')
        return
      }
    }
  }
  step(dt:number){
    if(this.winner!==null)return
    this.time+=dt
    this.fire=this.fire.filter(f=>(f.life-=dt)>0)
    this.impacts=this.impacts.filter(impact=>(impact.life-=dt)>0)
    for(const t of this.trenches){
      t.fort=Math.max(0,t.fort-dt)
      t.breach=Math.max(0,t.breach-dt)
    }
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
    }
    this.resolveTunnelOperations()
    if(this.winner!==null)return
    this.updateCrews()
    this.combat(dt)
    this.recruitAlliedSurface()
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
      const trench=this.trenches.find(t=>Math.abs(t.x-u.x)<40&&t.side===u.side&&t.breach===0)
      u.reload-=dt;u.motion=false
      const shell=this.suppression[u.side],under=shell.time>0&&Math.abs(shell.x-u.x)<165
      u.morale=Math.max(.45,Math.min(1,u.morale+dt*(under?-.15:.035)))
      if(target&&army.stance!=='retreat'){
        if(u.reload<=0){
          const cover=this.trenches.find(t=>t.side===enemy&&Math.abs(t.x-target!.x)<40&&t.breach===0)
          target.hp-=(u.role==='gun'?(trench?24:16):12)*u.morale*(cover?(cover.fort>0?.28:.55):1)
          u.reload=(1.4+this.random())*(under?1.8:1)
          this.fire.push({x:u.x,end:target.x,life:.13,side:u.side,role:u.role})
          const killed=target.hp<=0
          const hit={x:target.x,side:target.side,time:this.time,seed:Math.imul(++this.impactSerial,0x9e3779b1)>>>0}
          this.impacts.push({...hit,killed,life:.45})
          if(killed)this.casualties.push(hit)
        }
      }else{
        const offset=(u.id%7)*4*(u.side?1:-1)
        const dx=army.goal+offset-u.x,move=rules.speed[u.role]*dt
        u.motion=Math.abs(dx)>1;u.x+=Math.sign(dx)*Math.min(Math.abs(dx),move)
      }
      if(Math.abs(u.x-HQ[enemy])<52)this.armies[enemy].hp-=dt*.14
      for(const t of this.trenches)if(t.side!==u.side&&Math.abs(u.x-t.x)<20&&!this.units.some(e=>e.side===enemy&&e.hp>0&&Math.abs(e.x-t.x)<42)){
        t.side=u.side;t.fort=0;t.breach=0;army.stats.captures++;this.report((u.side?'Enemy':'Allies')+' captured trench '+(this.trenches.indexOf(t)+1)+'.')
      }
    }
    if(this.fire.length>MAX_COMBAT_EFFECTS)this.fire.splice(0,this.fire.length-MAX_COMBAT_EFFECTS)
    if(this.impacts.length>MAX_COMBAT_EFFECTS)this.impacts.splice(0,this.impacts.length-MAX_COMBAT_EFFECTS)
    if(this.casualties.length>MAX_CASUALTIES)this.casualties.splice(0,this.casualties.length-MAX_CASUALTIES)
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
    if(front&&r()<.34)this.ability(1,'shell',2,front.x)
    this.nextAI=this.time+7+r()*10
  }
}
