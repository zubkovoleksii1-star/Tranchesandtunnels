import './styles.css'
import {Simulation} from './game/simulation'
import {clock,distance,GROUND,HQ,type Point} from './game/config'
import {Battlefield} from './rendering/battlefield'
import {layout,el} from './ui/layout'
import {icon} from './ui/icons'
import {frame,place,type View} from './ui/camera'
import {translate} from './ui/copy'
import {drawProfile} from './ui/profile'
import {simplifyStroke,soilPoint,worldPoint} from './ui/drawing'

layout()
const field=el('field')
const renderer=new Battlefield(field)
const dialog=el('dialog') as HTMLDialogElement
const profile=el('route-profile') as HTMLCanvasElement
const views=Array.from(document.querySelectorAll<HTMLButtonElement>('[data-view]'))
const seed=()=>crypto.getRandomValues(new Uint32Array(1))[0]

let game=new Simulation(seed())
let view:View='follow'
let camera=frame(view,field,game.digFace,game.digDirection.x)
let paused=false
let accumulated=0
let previous=performance.now()
let lastUpdate=-Infinity
let latestReport:object|undefined
let lastRenderedTime=-1
let redraw=true
new ResizeObserver(()=>{redraw=true}).observe(field)
let armed=false
let stroke:{id:number;startX:number;startY:number;dragged:boolean;points:Point[]}|undefined
let feedback='',feedbackUntil=0
const drawButton=el('draw-route') as HTMLButtonElement
const drawLabel=drawButton.querySelector('span')!
const autoButton=el('autopilot') as HTMLButtonElement

function mapLabel(text:string,kind:string){
  const label=document.createElement('span')
  label.className='marker '+kind
  label.textContent=text
  el('markers').append(label)
  return label
}

const bases=HQ.map((_,i)=>mapLabel(i?'Штаб врага':'Наш штаб',i?'hq enemy':'hq'))
const targets=game.tunnelTargets(0).map(target=>({
  ...target,labelElement:mapLabel(target.label,'objective-tag')
}))

function updateMap(){
  const face=game.digFace
  camera=frame(view,field,face,game.digDirection.x)
  place(el('dig-marker'),face,camera)
  bases.forEach((label,i)=>place(label,{x:HQ[i],y:GROUND-53},camera))
  // In a phone overview the rings and the route profile identify closely spaced goals.
  const compact=view==='overview'&&field.clientWidth<610
  for(const goal of targets){
    const reached=game.tunnelTargetReached(0,goal.id)
    place(goal.labelElement,{x:goal.point.x,y:goal.point.y+goal.radius+14},camera)
    goal.labelElement.hidden ||= compact
    goal.labelElement.classList.toggle('reached',reached)
  }
}

function updateStatus(){
  const face=game.digFace
  const west=game.digDirection.x<0
  const ahead=west?[...targets].reverse():targets
  const assigned=game.autoSteer?game.botTarget(0):undefined
  const next=targets.find(goal=>goal.id===assigned)??ahead.find(goal=>!game.tunnelTargetReached(0,goal.id)&&
    (west?goal.point.x-goal.radius<=face.x:goal.point.x+goal.radius>=face.x))
  let guidance='У границы сектора'
  if(next){
    const dy=next.point.y-face.y
    const depth=Math.abs(dy)<=next.radius?'на уровне забоя':dy<0?'выше забоя':'ниже забоя'
    guidance=next.label+' · '+depth
  }
  el('map-guidance').textContent=guidance
  el('direction-status').textContent=game.autoSteer?'Автопилот · '+game.digStatus:game.digStatus
  el('dig-distance').textContent=Math.floor(game.armies[0].stats.length)+' м'
  el('allied-goals').textContent=targets.filter(goal=>game.tunnelTargetReached(0,goal.id)).length+' / '+targets.length
  el('enemy-goals').textContent=targets.filter(goal=>game.tunnelTargetReached(1,goal.id)).length+' / '+targets.length
  drawButton.setAttribute('aria-pressed',String(armed))
  drawLabel.textContent=armed?'Отмена':game.autoSteer?'Нарисовать ход':'Изменить линию'
  autoButton.hidden=game.autoSteer||armed
  const hint=el('route-hint')
  hint.textContent=stroke?'Отпусти, чтобы отправить инженеров.':performance.now()<feedbackUntil?feedback:armed?'Бой на паузе. Проведи линию в грунте от забоя.':''
  hint.hidden=!hint.textContent
  for(const button of views)button.setAttribute('aria-pressed',String(button.dataset.view===view))
  el('timer').textContent=clock(game.time)
  el('status').textContent=paused?'Пауза':''
  const pause=el('pause') as HTMLButtonElement
  if(pause.dataset.paused!==String(paused)){
    pause.dataset.paused=String(paused)
    pause.innerHTML=icon(paused?'play':'pause')
    pause.setAttribute('aria-label',paused?'Продолжить':'Пауза')
  }
  for(const [i,prefix] of ['a','e'].entries()){
    const hp=Math.max(0,Math.ceil(game.armies[i].hp))
    el(prefix+'h').textContent=hp+'%'
    ;(el(prefix+'m') as HTMLMeterElement).value=hp
  }
  drawProfile(profile,game)
  if(latestReport!==game.log[0]){
    const rows=game.log.map(event=>{
      const row=document.createElement('p'),time=document.createElement('time')
      time.textContent=clock(event.time)
      row.append(time,translate(event.msg))
      return row
    })
    el('log').replaceChildren(...rows)
    latestReport=game.log[0]
    window.dispatchEvent(new CustomEvent('underfront:report',{detail:latestReport}))
  }
}

function stopDrawing(){
  redraw=true
  if(stroke&&field.hasPointerCapture(stroke.id))field.releasePointerCapture(stroke.id)
  stroke=undefined
  armed=false
  feedback=''
}
views.forEach(button=>button.onclick=()=>{
  stopDrawing()
  view=button.dataset.view as View
  field.dataset.view=view
  updateMap()
  updateStatus()
})

drawButton.onclick=()=>{
  const enable=!armed
  stopDrawing()
  armed=enable
  updateStatus()
}
autoButton.onclick=()=>{
  stopDrawing()
  game.setAutoSteer(true)
  redraw=true
  updateStatus()
}

field.onpointerdown=e=>{
  if(dialog.open||game.winner!==null||stroke||!e.isPrimary||e.button!==0)return
  const bounds=field.getBoundingClientRect()
  const start=worldPoint(e.clientX,e.clientY,bounds,camera)
  const face=game.digFace
  const nearFace=Math.hypot((start.x-face.x)*bounds.width/camera.width,(start.y-face.y)*bounds.height/camera.height)<=44
  if(start.y<GROUND)return
  feedback=''
  redraw=true
  stroke={id:e.pointerId,startX:e.clientX,startY:e.clientY,dragged:false,points:[{...face}]}
  if(!nearFace)stroke.points.push(soilPoint(start))
  field.setPointerCapture(e.pointerId)
  updateStatus()
}

function trace(e:PointerEvent){
  if(!stroke||stroke.id!==e.pointerId)return
  stroke.dragged ||= Math.hypot(e.clientX-stroke.startX,e.clientY-stroke.startY)>=8
  if(!stroke.dragged)return
  const p=soilPoint(worldPoint(e.clientX,e.clientY,field.getBoundingClientRect(),camera))
  if(distance(p,stroke.points[stroke.points.length-1])<2)return
  if(stroke.points.length>=512)stroke.points=simplifyStroke(stroke.points,2)
  if(stroke.points.length<512){stroke.points.push(p);redraw=true}
}
field.onpointermove=trace
field.onpointerup=e=>{
  if(!stroke||stroke.id!==e.pointerId)return
  trace(e)
  const {points,dragged}=stroke
  if(dragged){
    const tolerance=Math.max(1.5,2*camera.height/field.clientHeight)
    const accepted=game.setDrawnRoute(simplifyStroke(points,tolerance))
    if(accepted)armed=false
    feedback=accepted?'Маршрут принят. В конце управление вернётся боту.':'Нарисуй более длинный ход.'
    feedbackUntil=performance.now()+3000
  }
  stroke=undefined
  redraw=true
  if(field.hasPointerCapture(e.pointerId))field.releasePointerCapture(e.pointerId)
  updateStatus()
}
field.onlostpointercapture=field.onpointercancel=e=>{
  if(stroke?.id===e.pointerId){stroke=undefined;redraw=true;updateStatus()}
}

function togglePause(){paused=!paused;updateStatus()}
el('pause').onclick=togglePause

function modal(title:string,body:string,result=false){
  el('dialog-inner').innerHTML='<h2>'+title+'</h2>'+body+'<button id="close-dialog">'+(result?'Новый бой':'Вернуться к бою')+'</button>'
  if(!dialog.open)dialog.showModal()
  el('close-dialog').onclick=()=>{
    if(result){
      stopDrawing()
      game=new Simulation(seed())
      view='follow'
      field.dataset.view=view
      paused=false
      accumulated=0
      updateMap()
    }
    dialog.close()
    updateStatus()
  }
}
el('manual').onclick=()=>modal('Как играть',
  '<p>Обе армии сами ведут бой, пополняют отряды и прокладывают тоннели. Можно наблюдать весь матч без приказов.</p>'+
  '<p>Чтобы изменить ход союзников, проведи линию пальцем или мышью от инженера. Повороты задаются формой линии. Можно рисовать сразу на карте. Кнопка «Нарисовать ход» даёт паузу для планирования. Отпусти — и инженеры пойдут по маршруту. В конце их снова поведёт бот.</p>'+
  '<p>Подземный прорыв под окопом временно лишает защитников укрытия, а под штабом наносит урон. Сторона, которая первой соединит обе траншеи противника и штаб, выигрывает. Можно победить и на поверхности, разрушив штаб.</p>'+
  '<p>«Весь фронт» показывает карту целиком. Пробел ставит бой на паузу, Escape отменяет рисунок.</p>')
dialog.oncancel=e=>{if(game.winner!==null)e.preventDefault()}
window.onkeydown=e=>{
  if(dialog.open||e.repeat||e.ctrlKey||e.altKey||e.metaKey)return
  if(e.key==='Escape'){stopDrawing();updateStatus()}
  if(e.code==='Space'&&!(e.target instanceof HTMLButtonElement)){e.preventDefault();togglePause()}
}

function animate(now:number){
  const dt=Math.min(.2,(now-previous)/1000)
  previous=now
  if(!paused&&!dialog.open&&!armed&&!stroke&&game.winner===null){
    accumulated+=dt
    while(accumulated>=.05){game.step(.05);accumulated-=.05}
  }
  if(game.winner!==null&&!dialog.open){
    const stats=game.armies[0].stats
    const reached=targets.filter(t=>game.tunnelTargetReached(0,t.id)).length
    modal(game.winner===0?'Победа':'Поражение',
      (reached===targets.length?'<p>Союзные инженеры соединили три цели под позициями противника.</p>':targets.every(t=>game.tunnelTargetReached(1,t.id))?'<p>Вражеские инженеры соединили три цели под нашими позициями.</p>':'')+
      '<p>Бой завершился за '+clock(game.time)+'.</p><p>Пройдено под землёй: '+Math.round(stats.length)+' м<br>Подземных целей достигнуто: '+reached+' / '+targets.length+'<br>Подземных столкновений: '+stats.contacts+'<br>Захвачено окопов: '+stats.captures+'</p>',true)
  }
  if(redraw||game.time!==lastRenderedTime){
    updateMap()
    renderer.draw(game,camera,stroke?.points)
    lastRenderedTime=game.time
    redraw=false
  }
  if(now-lastUpdate>=200){updateStatus();lastUpdate=now}
  requestAnimationFrame(animate)
}
field.dataset.view=view
updateMap()
updateStatus()
requestAnimationFrame(animate)
