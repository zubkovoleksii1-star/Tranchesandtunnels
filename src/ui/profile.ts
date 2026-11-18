import {GROUND,H,W,type Point} from '../game/config'
import type {Simulation} from '../game/simulation'
import {tip} from '../game/tunnels'

// Show the whole underground route while the main camera follows the dig face.
export function drawProfile(canvas:HTMLCanvasElement,game:Simulation){
  const ctx=canvas.getContext('2d')
  if(!ctx||!canvas.clientWidth)return
  const width=canvas.clientWidth,height=canvas.clientHeight
  const ratio=Math.min(2,window.devicePixelRatio||1)
  if(canvas.width!==Math.round(width*ratio)||canvas.height!==Math.round(height*ratio)){
    canvas.width=Math.round(width*ratio)
    canvas.height=Math.round(height*ratio)
  }
  ctx.setTransform(ratio,0,0,ratio,0,0)
  ctx.clearRect(0,0,width,height)
  const x=(n:number)=>6+n/W*(width-12)
  const y=(n:number)=>5+(n-GROUND)/(H-GROUND)*(height-10)
  const line=(a:Point,b:Point)=>{
    ctx.beginPath();ctx.moveTo(x(a.x),y(a.y));ctx.lineTo(x(b.x),y(b.y));ctx.stroke()
  }
  ctx.strokeStyle='#43514b';ctx.lineWidth=1
  line({x:0,y:GROUND},{x:W,y:GROUND})
  for(const t of game.net.paths){
    if(t.reusing||(t.side!==0&&!t.seen))continue
    ctx.strokeStyle=t.side?'#bd8477':'#9fbaac'
    ctx.lineWidth=t.side?1.25:2
    line(t.a,tip(t))
  }
  for(const target of game.tunnelTargets(0)){
    ctx.save()
    ctx.translate(x(target.point.x),y(target.point.y));ctx.rotate(Math.PI/4)
    const reached=game.tunnelTargetReached(0,target.id)
    ctx.fillStyle=reached?'#a5c6b7':'#2e2721';ctx.fillRect(-3,-3,6,6)
    ctx.strokeStyle=reached?'#a5c6b7':'#d4ad73';ctx.lineWidth=1.5;ctx.strokeRect(-3,-3,6,6)
    ctx.restore()
  }
  const face=game.digFace
  ctx.fillStyle='#211d19';ctx.fillRect(x(face.x)-4,y(face.y)-4,8,8)
  ctx.fillStyle='#ffcf69';ctx.fillRect(x(face.x)-2.5,y(face.y)-2.5,5,5)
}
