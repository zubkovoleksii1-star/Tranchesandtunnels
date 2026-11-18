import {GROUND,H,W,type Point} from '../game/config'
import type {Camera} from '../rendering/battlefield'

export type View = 'overview' | 'surface' | 'tunnels'
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n))
const frames:Record<View,{top:number;height:number}> = {
  overview:{top:0,height:H},
  surface:{top:56,height:GROUND+47-56},
  tunnels:{top:GROUND-6,height:H-GROUND+6}
}
export class MapCamera {
  view:View='overview'
  center=340
  zoomed=false
  frame(host:HTMLElement):Camera {
    const {top,height}=frames[this.view]
    if(this.view==='overview'&&!this.zoomed)return {x:0,y:0,width:W,height:H}
    const viewHeight=height*(this.zoomed?.78:1)
    const width=clamp(viewHeight*host.clientWidth/Math.max(1,host.clientHeight),200,W)
    return {
      x:clamp(this.center-width/2,0,W-width),
      y:top+(height-viewHeight)*(this.view==='surface'?.8:.5),
      width,height:viewHeight
    }
  }
  pan(host:HTMLElement,dx:number){
    const {x,width}=this.frame(host)
    this.center=clamp(x+width/2+dx,width/2,W-width/2)
  }
}
export function place(element:HTMLElement,point:Point,camera:Camera){
  const x=(point.x-camera.x)/camera.width
  const y=(point.y-camera.y)/camera.height
  element.hidden=x<.025||x>.975||y<.07||y>.93
  element.style.left=x*100+'%'
  element.style.top=y*100+'%'
}
