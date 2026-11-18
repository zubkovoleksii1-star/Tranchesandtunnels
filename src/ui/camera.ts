import {H,W,type Point} from '../game/config'
import type {Camera} from '../rendering/battlefield'

export type View = 'overview' | 'follow'
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n))

export function frame(view:View,host:HTMLElement,face:Point,travelX:number):Camera {
  if(view==='overview')return {x:0,y:0,width:W,height:H}
  const aspect=host.clientWidth/Math.max(1,host.clientHeight)
  // Keep the surface line and the current face in view, with space ahead to steer.
  const height=clamp(face.y+60-75,235,H-45)
  const width=Math.min(W,height*aspect)
  return {
    x:clamp(face.x-width*(travelX<0?.68:.32),0,W-width),
    y:clamp(face.y+60-height,0,H-height),
    width,height
  }
}

export function place(element:HTMLElement,point:Point,camera:Camera){
  const x=(point.x-camera.x)/camera.width
  const y=(point.y-camera.y)/camera.height
  element.hidden=x<.018||x>.982||y<.04||y>.96
  element.style.left=x*100+'%'
  element.style.top=y*100+'%'
}
