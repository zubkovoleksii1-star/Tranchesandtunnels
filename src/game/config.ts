export type Side = 0 | 1
export type Role = 'infantry' | 'gun' | 'engineer'
export type Ability = 'reserve' | 'shell' | 'fort'
export type Point = {x:number, y:number}
export const W = 1280, H = 440, GROUND = 179
export const HQ = [65,1215]
export const rules = {
  income:[0.72,0.48], digRate:3.8, digCost:0.18, orderCost:3,
  recruits:{infantry:[14,3],gun:[23,14],engineer:[16,8]},
  powers:{reserve:[7,65,25],shell:[18,55,15],fort:[12,50,28]},
  range:{infantry:88,gun:135}, speed:{infantry:6.5,gun:4.4}
}
export function generator(seed:number) {
  return () => {seed=(Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296}
}
export const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y)
export const clock=(n:number)=>Math.floor(n/60).toString().padStart(2,'0')+':'+Math.floor(n%60).toString().padStart(2,'0')
