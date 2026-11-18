import {Container, SCALE_MODES, Sprite, Texture} from 'pixi.js'
import type {Side} from '../game/config'

type Figure = 'infantry' | 'gun' | 'engineer' | 'fallen'
const colors = [
  {u:'#42676b', l:'#628d89', v:'#2d484d', h:'#406467', j:'#789e94'},
  {u:'#95613d', l:'#c18b59', v:'#623c2c', h:'#7a5037', j:'#b48154'}
]
const equipment = {
  o:'#182022', m:'#c99b76', n:'#91694d', b:'#433629', s:'#8c6947',
  k:'#101719', r:'#3b4545', a:'#87928c', g:'#d8b87c', d:'#69222b'
}

const head = [
  '...ooo....',
  '..ojjho...',
  '.ojhhhho..',
  'oohhhhhhoo',
  '..onmmno..',
  '...omko...',
  '....mno...'
]
const torso = [
  '...ooo...',
  '.ookslo..',
  'obbluuvo.',
  'obslulvo.',
  'obsluvo..',
  'obsbbuo..',
  '.ovgsvo..',
  '..ovuuvo.',
  '..ovvvvo.'
]
const boots = [
  [
    '..ovvo...ovvo..',
    '..ovuo...ouvo..',
    '..ovuo...ouvo..',
    '..ovoo...oovo..',
    '..okko...okko..',
    '..okkko..okkko.'
  ],
  [
    '.....ovvvo....',
    '....ovuuvvo...',
    '...ovo..ovuo..',
    '..ovo....ouvo.',
    '.okko.....okko',
    '.okk......okk'
  ],
  [
    '...ovvvo.......',
    '...ovuuvvo.....',
    '....ovo.ovvo...',
    '....ovo..ouvo..',
    '....okko..okko.',
    '....okkk..okkko'
  ],
  [
    '....ovvvvo....',
    '....ovuuvvo...',
    '...ovo..ovvo..',
    '..ovu....ovuo.',
    '..okko...okko.',
    '..okkko..okkko'
  ]
]
const rifle = [
  '..........okkko',
  '...kkokkookarao',
  '.obabrrraagkko.',
  'oabbbgkbko.....',
  '.kkk..onmo.....'
]
const machineGun = [
  '......kkkkk.......',
  '...kokarrrokkkkkkk',
  '..kbrarrragoo.....',
  '...kbronko........',
  '.....k.k..k.......',
  '.....k....k.......',
  '....kk.....kk.....'
]
const pickUp = [
  '....kka.',
  '..kkaa..',
  '.kar...s',
  '......s.',
  '.....s..',
  '....s...',
  '...s....'
]
const pickDown = [
  's.......',
  '.s......',
  '..s..k..',
  '...skaak',
  '...kk..a',
  '..ka....'
]
const fallen = [
  '........................',
  '...........kk...........',
  '......oovvovvookk.ooko..',
  '....ovvvuuvuuvvookkkkkk.',
  '..ooulubbllulsbvo.mnn.o.',
  '.ohhjnmvvoogobvo.ookkk..',
  '.ohhhomoodooooooo.......',
  '..ooooddddd.............'
]

function makeFrame(side:Side, figure:Figure, frame:number){
  const canvas=document.createElement('canvas')
  canvas.width=28;canvas.height=24
  const ctx=canvas.getContext('2d')!
  const palette:Record<string,string>={...colors[side],...equipment}
  if(figure==='engineer'&&side===0){
    Object.assign(palette,{u:'#9e7954',l:'#c5a477',v:'#65513f',h:'#a18a56',j:'#d4b779'})
  }
  function paint(rows:string[],left:number,top:number){
    for(const [y,row] of rows.entries())for(const [x,key] of [...row].entries()){
      if(!palette[key])continue
      ctx.fillStyle=palette[key]
      ctx.fillRect(left+x,top+y,1,1)
    }
  }

  if(figure==='fallen'){
    paint(fallen,2,16)
  }else if(figure==='engineer'){
    const lift=frame===0?0:2
    paint(boots[lift?0:3],5,18)
    paint(torso,7,9)
    paint(head,7,4)
    paint(lift?pickUp:pickDown,14,lift?3:11)
    paint(['.oo.','omo.','..o.'],lift?14:15,lift?11:13)
    paint(['.gg.','.gg.'],13,5)
  }else{
    const walking=frame!==0
    const gun=figure==='gun'
    const bodyY=walking&&frame===2?1:0
    paint(boots[frame],4,18)
    paint(torso,6,9+bodyY)
    paint(head,7,3+bodyY)
    paint(gun?machineGun:rifle,10,gun?11+bodyY:10+bodyY)
  }
  const texture=Texture.from(canvas,{scaleMode:SCALE_MODES.NEAREST})
  return texture
}

export class Troops {
  readonly layer=new Container()
  private sprites:Sprite[]=[]
  private used=0
  private frames=new Map<string,Texture>()

  constructor(){
    for(const side of [0,1] as const){
      for(const figure of ['infantry','gun','engineer','fallen'] as const){
        const count=figure==='fallen'?1:figure==='engineer'?2:4
        for(let frame=0;frame<count;frame++){
          this.frames.set(`${side}:${figure}:${frame}`,makeFrame(side,figure,frame))
        }
      }
    }
  }

  begin(){this.used=0}

  draw(x:number,y:number,side:Side,figure:Figure,frame=0,alpha=1,scale=2,rotation=0,facing=side?-1:1){
    const texture=this.frames.get(`${side}:${figure}:${frame}`)!
    let sprite=this.sprites[this.used]
    if(!sprite){
      sprite=new Sprite(texture)
      sprite.anchor.set(10/28,1)
      this.layer.addChild(sprite)
      this.sprites.push(sprite)
    }
    this.used++
    sprite.texture=texture
    sprite.position.set(Math.round(x),Math.round(y))
    sprite.scale.set(facing*scale,scale)
    sprite.rotation=rotation
    sprite.alpha=alpha
    sprite.visible=true
  }

  end(){
    for(let i=this.used;i<this.sprites.length;i++)this.sprites[i].visible=false
  }
}
