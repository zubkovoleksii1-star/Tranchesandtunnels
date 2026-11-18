import './styles.css'
import {Simulation,type TunnelTargetId} from './game/simulation'
import {clock,GROUND,HQ,rules,W,type Ability,type Role} from './game/config'
import {Battlefield,type Camera} from './rendering/battlefield'
import {layout,el} from './ui/layout'
import {icon} from './ui/icons'
import {MapCamera,place,type View} from './ui/camera'
import {translate} from './ui/copy'
import {tip} from './game/tunnels'

layout()
const field=el('field'),renderer=new Battlefield(field),dialog=el('dialog') as HTMLDialogElement
const map=new MapCamera()
const narrow=()=>window.matchMedia('(max-width: 600px)').matches
if(narrow())map.view='surface'
const seed=()=>crypto.getRandomValues(new Uint32Array(1))[0]
let game=new Simulation(seed()),selected=1,paused=false,selectedTarget:TunnelTargetId|undefined
let message='',messageUntil=0,acc=0,previous=performance.now(),lastUI=-1
let camera=map.frame(field),following=false
const buttons=Array.from(document.querySelectorAll<HTMLButtonElement>('[data-action]'))
const views=Array.from(document.querySelectorAll<HTMLButtonElement>('[data-view]'))
const labels=['Западный тыловой','Западный передовой','Восточный передовой','Восточный тыловой']
const names={reserve:'Мобилизовать резерв',shell:'Вызвать артиллерию',fort:'Укрепить окоп'}
const shortTargets={front:'Окоп',rear:'Тыл',hq:'Штаб'}
const statusLabels={digging:'Проходка',complete:'Завершено',blocked:'Проход перекрыт'}
const trenches=game.trenches.map((_,i)=>{
  const button=document.createElement('button')
  button.className='marker trench'
  button.innerHTML=icon('flag')+' '+(i+1)
  button.onclick=()=>{selected=i;notice('');update()}
  el('markers').append(button)
  return button
})
const headquarters=HQ.map((_,i)=>{
  const marker=document.createElement('span')
  marker.className='marker hq'+(i?' enemy':'')
  marker.textContent=i?'Штаб врага':'Свой штаб'
  el('markers').append(marker)
  return marker
})
const targets=game.tunnelTargets(0).map(({id,label,point})=>{
  const marker=document.createElement('button')
  marker.className='marker target'
  marker.textContent=shortTargets[id]
  marker.setAttribute('aria-label',label+' · подземная цель')
  marker.onclick=()=>selectTarget(id)
  el('markers').append(marker)
  const button=document.createElement('button')
  button.className='target-card'
  const title=document.createElement('strong')
  title.textContent=label
  const detail=document.createElement('span')
  button.append(title,detail)
  button.onclick=()=>selectTarget(id)
  el('targets').append(button)
  return {id,point,marker,button,detail}
})

function notice(m:string){message=translate(m);messageUntil=performance.now()+3600}
function press(element:HTMLElement,state:boolean){element.setAttribute('aria-pressed',String(state))}
function setView(view:View){
  following=false
  map.view=view
  if(view==='surface')map.center=game.trenches[selected].x
  if(view==='tunnels'&&selectedTarget)focusTarget(selectedTarget)
  update()
}
function focusTarget(id:TunnelTargetId){
  const plan=game.tunnelPlan(0,id),operation=game.tunnelOperation(0,id)
  const start=operation?.tunnel.a.x??plan.from.x,end=plan.target.point.x
  const {width}=map.frame(field)
  map.center=Math.abs(end-start)<width*.85?(start+end)/2:end
}
function selectTarget(id:TunnelTargetId){
  following=game.tunnelOperation(0,id)?.status==='digging'
  selectedTarget=id
  map.view='tunnels'
  focusTarget(id)
  notice('')
  update()
  el('operation-detail').scrollIntoView({block:'nearest'})
}
function updateMap(){
  const operation=selectedTarget&&following?game.tunnelOperation(0,selectedTarget):undefined
  if(operation?.status==='digging')map.center=tip(operation.tunnel).x
  else following=false
  field.dataset.view=map.view
  field.dataset.zoomed=String(map.zoomed)
  camera=map.frame(field)
  headquarters.forEach((marker,i)=>{
    place(marker,{x:HQ[i],y:GROUND-61},camera)
    marker.hidden ||= map.view==='tunnels'
  })
  for(const [i,button] of trenches.entries()){
    const trench=game.trenches[i]
    place(button,{x:trench.x,y:GROUND+23},camera)
    button.hidden ||= map.view==='tunnels'
    button.classList.toggle('enemy',trench.side===1)
    button.setAttribute('aria-label',labels[i]+' окоп'+(trench.side?' противника':' союзников'))
    press(button,selected===i)
  }
  for(const {id,point,marker} of targets){
    place(marker,point,camera)
    marker.hidden ||= map.view==='surface'||(map.view==='overview'&&narrow()&&!map.zoomed)
    const status=game.tunnelOperation(0,id)?.status
    marker.dataset.state=status??''
    press(marker,id===selectedTarget)
  }
  const panned=camera.width<W-1
  ;(el('camera-left') as HTMLButtonElement).disabled=!panned||camera.x<1
  ;(el('camera-right') as HTMLButtonElement).disabled=!panned||camera.x+camera.width>W-1
  el('map-position').textContent=panned?'Участок '+(camera.x+camera.width/2<W/3?'слева':camera.x+camera.width/2>W*2/3?'справа':'в центре'):'Весь фронт'
}

function update(){
  updateMap()
  const a=game.armies[0]
  el('timer').textContent=clock(game.time)
  el('mp').textContent=String(Math.floor(a.mp));el('sup').textContent=String(Math.floor(a.sup))
  for(const [i,prefix] of ['a','e'].entries()){
    const hp=Math.max(0,Math.ceil(game.armies[i].hp));el(prefix+'h').textContent=hp+'%';(el(prefix+'m') as HTMLMeterElement).value=hp
  }
  const pause=el('pause')
  pause.innerHTML=icon(paused?'play':'pause')
  pause.setAttribute('aria-label',paused?'Продолжить':'Пауза')
  el('status').textContent=paused?'Пауза':''
  el('camera-zoom').textContent=map.zoomed?'−':'+'
  el('camera-zoom').setAttribute('aria-label',map.zoomed?'Уменьшить карту':'Увеличить карту')
  views.forEach(b=>press(b,b.dataset.view===map.view))
  const trench=game.trenches[selected]
  const owner=trench.side?'враг':'наш'
  el('context').textContent=map.view==='tunnels'
    ? 'Выбери цель на карте или в списке'
    : labels[selected]+' окоп · '+owner+(trench.breach>0?' · без укрытия ещё '+Math.ceil(trench.breach)+' с':'')
  el('hint').hidden=!message||performance.now()>=messageUntil
  el('hint').textContent=message
  for(const b of buttons){
    const id=b.dataset.action!
    const cost=rules.recruits[id as Role]
    b.disabled=Boolean(cost&&(a.mp<cost[0]||a.sup<cost[1]))
    if(id==='dig'||id==='abilities')press(b,id==='dig'?map.view==='tunnels':!el('powers').hidden)
  }
  for(const k of Object.keys(names) as Ability[]){
    const b=el('power-'+k) as HTMLButtonElement
    b.textContent=names[k]+' · '+(a.cd[k]>0?Math.ceil(a.cd[k])+' с':rules.powers[k][0]+' прип.')
    b.disabled=a.cd[k]>0||a.sup<rules.powers[k][0]
  }
  updateOperations()
  if(game.log[0]!==lastEvent){
    const rows=game.log.map(e=>{
      const row=document.createElement('p'),time=document.createElement('time')
      time.textContent=clock(e.time)
      row.append(time,translate(e.msg))
      return row
    })
    el('log').replaceChildren(...rows)
    lastEvent=game.log[0]
    window.dispatchEvent(new CustomEvent('underfront:report',{detail:lastEvent}))
  }
}
function updateOperations(){
  el('operations').hidden=map.view!=='tunnels'
  if(map.view!=='tunnels')return
  const crew=game.armies[0].engineers
  el('crew').textContent='Свободно инженеров '+(crew-game.net.active(0).length)+' / '+crew
  for(const {id,button,detail} of targets){
    const plan=game.tunnelPlan(0,id),operation=game.tunnelOperation(0,id)
    press(button,id===selectedTarget)
    if(operation?.status==='digging')detail.textContent='Осталось '+Math.ceil(operation.seconds)+' с'
    else if(operation)detail.textContent=statusLabels[operation.status]
    else if(plan.target.trench!==null&&game.trenches[plan.target.trench].side===0)detail.textContent='Под нашим контролем'
    else detail.textContent=plan.cost+' прип. · '+Math.ceil(plan.seconds)+' с'
  }
  el('operation-detail').hidden=!selectedTarget
  if(!selectedTarget)return
  const plan=game.tunnelPlan(0,selectedTarget),operation=game.tunnelOperation(0,selectedTarget)
  const progress=el('operation-progress') as HTMLProgressElement
  const confirm=el('operation-confirm') as HTMLButtonElement
  el('operation-name').textContent=plan.target.label
  el('operation-effect').textContent=plan.target.effect
  el('operation-status').textContent=operation?.status==='digging'
    ? 'Проходка · '+Math.round(operation.tunnel.p*100)+'% · осталось '+Math.ceil(operation.seconds)+' с'
    : operation?.status==='complete'
      ? 'Прорыв завершён.'
      : [operation?.status==='blocked'?'Проход перекрыт.':'',plan.cost+' прип. · '+Math.ceil(plan.seconds)+' с · 1 группа',plan.error].filter(Boolean).join(' · ')
  progress.hidden=operation?.status!=='digging'
  progress.value=operation?.tunnel.p??0
  el('operation-follow').hidden=operation?.status!=='digging'
  press(el('operation-follow'),following)
  confirm.hidden=operation?.status==='digging'||operation?.status==='complete'
  confirm.disabled=Boolean(plan.error)||game.winner!==null
  confirm.textContent=operation?.status==='blocked'?'Проложить заново':'Начать проходку'
}

function act(id:string){
  if(dialog.open||game.winner!==null)return
  if(id==='abilities'){el('powers').hidden=!el('powers').hidden;update();return}
  if(id==='dig'){setView(map.view==='tunnels'?'overview':'tunnels');if(map.view==='tunnels')el('operations').scrollIntoView({block:'nearest'});return}
  notice(id in rules.recruits?game.recruit(0,id as Role):game.order(0,id,selected))
  update()
}
buttons.forEach(b=>b.onclick=()=>act(b.dataset.action!))
views.forEach(b=>b.onclick=()=>setView(b.dataset.view as View))
for(const k of Object.keys(names) as Ability[]){
  const b=document.createElement('button');b.id='power-'+k
  b.onclick=()=>{notice(game.ability(0,k,selected));update()}
  el('powers').append(b)
}
el('operation-confirm').onclick=()=>{
  if(!selectedTarget||game.winner!==null)return
  const error=game.startTunnel(0,selectedTarget)
  if(!error)following=true
  notice(error);update()
}
el('operation-follow').onclick=()=>{following=!following;update()}
el('camera-left').onclick=()=>{following=false;map.pan(field,-camera.width*.62);updateMap()}
el('camera-right').onclick=()=>{following=false;map.pan(field,camera.width*.62);updateMap()}
el('camera-zoom').onclick=()=>{map.zoomed=!map.zoomed;update()}
new ResizeObserver(updateMap).observe(field)

let drag:{id:number;x:number}|undefined
field.onpointerdown=e=>{
  if((e.target as HTMLElement).closest('button')||e.button!==0)return
  drag={id:e.pointerId,x:e.clientX}
  field.setPointerCapture(e.pointerId)
}
field.onpointermove=e=>{
  if(drag?.id!==e.pointerId)return
  following=false
  map.pan(field,(drag.x-e.clientX)*camera.width/field.clientWidth)
  drag.x=e.clientX
  updateMap()
}
field.onlostpointercapture=()=>{drag=undefined}
function togglePause(){paused=!paused;update()}
el('pause').onclick=togglePause
function modal(title:string,body:string,result=false){
  el('dialog-inner').innerHTML='<h2>'+title+'</h2>'+body+'<button id="close-dialog">'+(result?'Новый бой':'Вернуться к бою')+'</button>'
  if(!dialog.open)dialog.showModal()
  el('close-dialog').onclick=()=>{
    if(result){
      game=new Simulation(seed());selected=1;selectedTarget=undefined;paused=false;acc=0;following=false
      Object.assign(map,new MapCamera());if(narrow())map.view='surface';notice('');el('powers').hidden=true
    }
    dialog.close();update()
  }
}
el('manual').onclick=()=>modal('Как играть',
  '<p>Нанимай войска и веди их к вражескому штабу. Они стреляют сами. Выбери свой окоп на карте и нажми «В окоп», чтобы занять оборону.</p>'+
  '<p>Открой «Тоннели», выбери цель, проверь цену и время и подтверди проходку. Прорыв под окопом временно снимает укрытие. Под штабом он наносит разовый урон. При встрече с противником инженеры могут потерять проход.</p>'+
  '<p>Кнопки над картой переключают слои, приближают и двигают карту. Можно перетаскивать поле влево и вправо. Клавиши 1–8 выполняют команды, пробел ставит игру на паузу.</p>')
dialog.oncancel=e=>{if(game.winner!==null)e.preventDefault()}
window.onkeydown=e=>{
  if(dialog.open||e.repeat||e.ctrlKey||e.altKey||e.metaKey)return
  if(e.key==='Escape'){selectedTarget=undefined;following=false;notice('');el('powers').hidden=true;update()}
  if(e.code==='Space'&&!(e.target instanceof HTMLButtonElement)){e.preventDefault();togglePause()}
  if(/^[1-8]$/.test(e.key))act(buttons[Number(e.key)-1].dataset.action!)
}

let lastEvent:object|undefined
function frame(now:number){
  const dt=Math.min(.2,(now-previous)/1000);previous=now
  if(!paused&&!dialog.open&&game.winner===null){acc+=dt;while(acc>=.05){game.step(.05);acc-=.05}}
  if(game.winner!==null&&!dialog.open){
    const a=game.armies[0].stats
    modal(game.winner===0?'Победа':'Поражение','<p>Бой завершился за '+clock(game.time)+'.</p><p>Нанято отрядов: '+a.units+'<br>Захвачено позиций: '+a.captures+'<br>Длина проходки: '+Math.round(a.length)+' ед.<br>Подземных столкновений: '+a.contacts+'</p>',true)
  }
  const status=selectedTarget?game.tunnelOperation(0,selectedTarget)?.status:undefined
  const plan=map.view==='tunnels'&&selectedTarget&&(!status||status==='blocked')
    ? game.tunnelPlan(0,selectedTarget):undefined
  renderer.draw(game,selected,camera,plan?{a:plan.from,b:plan.target.point}:undefined)
  if(now-lastUI>250){update();lastUI=now}
  requestAnimationFrame(frame)
}
update();requestAnimationFrame(frame)
