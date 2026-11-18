import './styles.css'
import {Simulation} from './game/simulation'
import {clock,distance,GROUND,H,rules,W,type Ability,type Point,type Role} from './game/config'
import {Battlefield} from './rendering/battlefield'
import {layout,el} from './ui/layout'
import {icon} from './ui/icons'
layout()
const field=el('field'),renderer=new Battlefield(field),dialog=el('dialog') as HTMLDialogElement
const seed=()=>crypto.getRandomValues(new Uint32Array(1))[0]
let game=new Simulation(seed()),selected=1,paused=false,digging=false,anchor:Point|undefined,hover:Point|undefined
let began:Point|undefined,hadAnchor=false,message='',messageUntil=0,acc=0,previous=performance.now(),lastUI=-1
const buttons=Array.from(document.querySelectorAll<HTMLButtonElement>('[data-action]'))
const labels=['Western rear trench','Western forward trench','Eastern forward trench','Eastern rear trench']
const names={reserve:'Reinforcements',shell:'Artillery support',fort:'Fortify trench'}
function clearOrder(){digging=false;anchor=hover=undefined}
function notice(m:string){message=m;messageUntil=performance.now()+3200}
function update(){
  el('timer').textContent=clock(game.time)
  const a=game.armies[0]
  el('mp').textContent=String(Math.floor(a.mp));el('sup').textContent=String(Math.floor(a.sup))
  for(const [i,prefix] of ['a','e'].entries()){
    const hp=Math.max(0,Math.ceil(game.armies[i].hp));el(prefix+'h').textContent=hp+'%';(el(prefix+'m') as HTMLMeterElement).value=hp
  }
  el('pause').innerHTML=icon(paused?'play':'pause');el('pause').setAttribute('aria-label',paused?'Resume game':'Pause game')
  el('status').textContent=paused?'PAUSED':game.winner!==null?'ENDED':'LIVE'
  el('crew').textContent=(a.engineers-game.net.active(0).length)+' / '+a.engineers+' engineers available'
  el('context').textContent='Selected · '+labels[selected]
  el('hint').textContent=message&&performance.now()<messageUntil?message:digging?(anchor?'Choose an underground destination.':'Select a point on an allied tunnel.'):''
  if(digging){const cancel=document.createElement('button');cancel.textContent='Cancel';cancel.onclick=()=>{clearOrder();notice('');update()};el('hint').append(' ',cancel)}
  for(const b of buttons){const id=b.dataset.action!;const cost=rules.recruits[id as Role]
    b.disabled=Boolean(cost&&(a.mp<cost[0]||a.sup<cost[1]));b.classList.toggle('active',id==='dig'&&digging||id==='abilities'&&!el('powers').hidden)
  }
  for(const k of Object.keys(names) as Ability[]){
    const b=el('power-'+k) as HTMLButtonElement
    b.textContent=names[k]+' · '+(a.cd[k]>0?Math.ceil(a.cd[k])+'s':rules.powers[k][0]+' supplies')
    b.disabled=a.cd[k]>0||a.sup<rules.powers[k][0]
  }
  el('log').innerHTML=game.log.map(e=>'<p><time>'+clock(e.time)+'</time>'+e.msg+'</p>').join('')
}
function act(id:string){
  if(dialog.open||game.winner!==null)return
  if(id==='abilities'){el('powers').hidden=!el('powers').hidden;update();return}
  if(id==='dig'){if(digging)clearOrder();else digging=true;notice('');update();return}
  clearOrder()
  if(id in rules.recruits)notice(game.recruit(0,id as Role))
  else notice(game.order(0,id,selected))
  update()
}
buttons.forEach(b=>b.onclick=()=>act(b.dataset.action!))
for(const k of Object.keys(names) as Ability[]){const b=document.createElement('button');b.id='power-'+k;b.onclick=()=>{notice(game.ability(0,k,selected));update()};el('powers').append(b)}
el('trench-tags').innerHTML=game.trenches.map((t,i)=>'<span class="tr-label" style="left:'+t.x/W*100+'%">T0'+(i+1)+'</span>').join('')
function mapPoint(e:PointerEvent){const r=field.getBoundingClientRect();return {x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height}}
field.onpointerdown=e=>{
  if(game.winner!==null)return
  began=mapPoint(e);hadAnchor=!!anchor;field.setPointerCapture(e.pointerId)
  if(began.y>GROUND+18&&!anchor){const q=game.net.anchor(0,began);if(q){digging=true;anchor=q;notice('')}}
  hover=began;update()
}
field.onpointermove=e=>{if(digging&&anchor)hover=mapPoint(e)}
field.onpointercancel=()=>{began=undefined}
field.onpointerup=e=>{
  if(!began)return
  const p=mapPoint(e)
  if(digging){
    if(!anchor)notice('Choose a connected allied tunnel.')
    else if(hadAnchor||distance(began,p)>17){const err=game.dig(0,anchor,p);notice(err||'Excavation ordered.');if(!err)clearOrder()}
  }else if(p.y<GROUND+25){
    const t=game.trenches.reduce((a,b)=>Math.abs(a.x-p.x)<Math.abs(b.x-p.x)?a:b)
    if(Math.abs(t.x-p.x)<70)selected=game.trenches.indexOf(t)
  }
  began=undefined;update()
}
function pause(){paused=!paused;update()}
el('pause').onclick=pause
function modal(title:string,body:string,result=false){
  el('dialog-inner').innerHTML='<h2>'+title+'</h2>'+body+'<button id="close-dialog">'+(result?'New operation':'Return to command')+'</button>'
  if(!dialog.open)dialog.showModal()
  el('close-dialog').onclick=()=>{
    if(result){game=new Simulation(seed());selected=1;paused=false;clearOrder();notice('');el('powers').hidden=true}
    dialog.close();update()
  }
}
el('manual').onclick=()=>modal('Field manual','<p>Capture the opposing headquarters. Infantry and machine gun teams fight automatically. Select a flag, then reinforce its trench, or order the entire line to advance or retreat.</p><p>Click an allied tunnel, then click or drag to a point in the soil. Each excavation needs a free engineer and consumes supplies. Branch anywhere along a connected passage. Reaching the enemy HQ underground damages its integrity.</p><p>Artillery suppresses the selected trench area. Fortify protects a friendly trench. Reinforcements triples manpower income for 25 seconds. After seven minutes both headquarters suffer supply attrition, reduced by holding trenches.</p><p>Keys 1–8 issue orders. Space pauses. Escape cancels excavation.</p>')
dialog.oncancel=e=>{if(game.winner!==null)e.preventDefault()}
window.onkeydown=e=>{
  if(dialog.open||e.repeat||e.ctrlKey||e.altKey||e.metaKey)return
  if(e.key==='Escape'){clearOrder();notice('');el('powers').hidden=true;update()}
  if(e.code==='Space'&&!(e.target instanceof HTMLButtonElement)){e.preventDefault();pause()}
  if(/^[1-8]$/.test(e.key))act(buttons[Number(e.key)-1].dataset.action!)
}
let lastEvent:object|undefined
function frame(now:number){
  const dt=Math.min(.2,(now-previous)/1000);previous=now
  if(!paused&&!dialog.open&&game.winner===null){acc+=dt;while(acc>=.05){game.step(.05);acc-=.05}}
  if(game.winner!==null&&!dialog.open){
    const a=game.armies[0].stats;modal(game.winner===0?'Allied victory':'Enemy victory','<p>Operation ended at '+clock(game.time)+'.</p><p>Units recruited: '+a.units+'<br>Positions captured: '+a.captures+'<br>Tunnel length excavated: '+Math.round(a.length)+' map units<br>Underground encounters: '+a.contacts+'</p>',true)
  }
  if(game.log[0]!==lastEvent){lastEvent=game.log[0];window.dispatchEvent(new CustomEvent('underfront:report',{detail:game.log[0]}))}
  renderer.draw(game,selected,anchor,hover)
  if(now-lastUI>250){update();lastUI=now}
  requestAnimationFrame(frame)
}
update();requestAnimationFrame(frame)
