import {GROUND,H,W,distance,type Point} from '../game/config'
import type {Camera} from '../rendering/battlefield'
import {nearest} from '../game/tunnels'

export function worldPoint(x:number,y:number,bounds:DOMRect,camera:Camera):Point{
  return {x:camera.x+(x-bounds.left)*camera.width/bounds.width,
    y:camera.y+(y-bounds.top)*camera.height/bounds.height}
}

export function soilPoint(p:Point):Point{
  return {x:Math.max(20,Math.min(W-20,p.x)),y:Math.max(GROUND+36,Math.min(H-18,p.y))}
}

// Discard hand jitter on straight runs while retaining deliberate corners.
export function simplifyStroke(points:Point[],tolerance:number):Point[]{
  if(points.length<3)return points.slice()
  const keep=new Set([0,points.length-1])
  const ranges=[[0,points.length-1]]
  while(ranges.length){
    const [first,last]=ranges.pop()!
    let furthest=-1,max=tolerance
    for(let n=first+1;n<last;n++){
      const deviation=distance(points[n],nearest(points[n],points[first],points[last]))
      if(deviation>max){furthest=n;max=deviation}
    }
    if(furthest>=0){
      keep.add(furthest)
      ranges.push([first,furthest],[furthest,last])
    }
  }
  return [...keep].sort((a,b)=>a-b).map(i=>points[i])
}
