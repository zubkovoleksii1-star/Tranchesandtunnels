import {distance, GROUND, H, rules, W, type Point, type Side} from './config'
import {Network, nearest, tip, type Tunnel} from './tunnels'

export type DigHeading='up'|'straight'|'down'

const clampDepth=(y:number)=>Math.max(GROUND+36,Math.min(H-18,y))
const MAX_ROUTE_POINTS=48

function simplifyRoute(points:Point[]){
  if(points.length<=MAX_ROUTE_POINTS+1)return points.slice(1)
  const kept=[0,points.length-1]
  while(kept.length<MAX_ROUTE_POINTS+1){
    let split=-1,insert=0,largestError=1
    for(let chunk=1;chunk<kept.length;chunk++){
      const start=kept[chunk-1],end=kept[chunk]
      for(let i=start+1;i<end;i++){
        const error=distance(points[i],nearest(points[i],points[start],points[end]))
        if(error>largestError){largestError=error;split=i;insert=chunk}
      }
    }
    if(split===-1)break
    kept.splice(insert,0,split)
  }
  return kept.slice(1).map(index=>points[index])
}

export class ExcavationCrew {
  heading:DigHeading='straight'
  travel:number
  private current?:Tunnel
  private appliedHeading:DigHeading='straight'
  private appliedTravel:number
  private origin:Point
  private waypoints:Point[]=[]
  private routeVersion=0
  private appliedRouteVersion=0

  constructor(private side:Side,private net:Network,private speed:number){
    this.travel=side?-1:1
    this.appliedTravel=this.travel
    this.origin={x:side?W-315:315,y:330}
    this.continue()
  }
  get face(){
    return this.current?tip(this.current):this.origin
  }
  get segment(){return this.current}
  get active(){
    const tunnel=this.current
    return tunnel&&(tunnel.p<1||tunnel.delay>0)?tunnel:undefined
  }
  get direction(){
    const tunnel=this.active
    if(!tunnel)return {x:this.travel,y:0}
    const length=distance(tunnel.a,tunnel.b)
    return {x:(tunnel.b.x-tunnel.a.x)/length,y:(tunnel.b.y-tunnel.a.y)/length}
  }
  get route():readonly Point[]{
    return this.waypoints
  }
  replaceRoute(points:readonly Point[]){
    const route=[this.face]
    const count=Math.min(512,points.length)
    let endpoint:Point|undefined
    for(let i=0;i<count;i++){
      const point=points[Math.round(i*(points.length-1)/(count-1||1))]
      if(!Number.isFinite(point.x)||!Number.isFinite(point.y))continue
      const next={x:Math.max(20,Math.min(W-20,point.x)),y:clampDepth(point.y)}
      endpoint=next
      if(distance(route.at(-1)!,next)>=8)route.push(next)
    }
    if(endpoint&&distance(route.at(-1)!,endpoint)>=0.01)route.push(endpoint)
    const length=route.slice(1).reduce((total,point,i)=>total+distance(route[i],point),0)
    if(length<28)return false
    this.waypoints=simplifyRoute(route)
    this.routeVersion++
    this.continue()
    return true
  }
  clearRoute(){
    if(!this.waypoints.length)return
    this.waypoints=[]
    this.routeVersion++
  }
  consumeWaypoint(){
    const point=this.waypoints[0]
    if(point&&!this.current?.delay&&distance(this.face,point)<0.01){
      this.waypoints.shift()
      this.routeVersion++
    }
  }
  continue(){
    const current=this.current,face=this.face,waypoint=this.waypoints[0]
    if(current?.delay)return
    if(current&&current.p<1&&this.routeVersion===this.appliedRouteVersion){
      if(waypoint||(this.heading===this.appliedHeading&&this.travel===this.appliedTravel))return
    }

    let destination:Point
    if(waypoint){
      const fraction=Math.min(1,160/distance(face,waypoint))
      destination={x:face.x+(waypoint.x-face.x)*fraction,y:face.y+(waypoint.y-face.y)*fraction}
    }else{
      const right=W-20,left=20
      const remaining=this.travel>0?right-face.x:face.x-left
      if(remaining<28)this.travel*=-1
      const length=Math.min(rules.autoDig.stride,this.travel>0?right-face.x:face.x-left)
      const sign=this.heading==='up'?-1:this.heading==='down'?1:0
      const y=face.y+length*rules.autoDig.incline*sign
      destination={x:face.x+length*this.travel,y:clampDepth(y)}
    }
    if(this.net.validate(this.side,face,destination,true,waypoint?0.01:28))return

    if(current){
      if(current.reusing||current.p===0)this.net.paths.splice(this.net.paths.indexOf(current),1)
      else if(current.p<1){current.b=face;current.p=1}
    }
    this.appliedHeading=this.heading
    this.appliedTravel=this.travel
    this.appliedRouteVersion=this.routeVersion
    this.current=this.net.extend(this.side,face,destination,this.speed,current)
  }
}
