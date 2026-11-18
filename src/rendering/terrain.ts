import {GROUND,H,HQ,W,generator} from '../game/config'

export const land=(x:number)=>GROUND+3*Math.sin(x*.031)+2*Math.sin(x*.071)

type Pixel=[number,number]
const scale=2
const width=W/scale,height=H/scale
const ground=(x:number)=>Math.round(land(x*scale)/scale)
const mix=(a:number,b:number,t:number)=>a+(b-a)*t
const cap=(v:number)=>Math.max(0,Math.min(1,v))

function grain(seed:number,step:number){
  const rand=generator(seed)
  const columns=Math.ceil(width/step)+3,rows=Math.ceil(height/step)+3
  const grid=Array.from({length:columns*rows},rand)
  const smooth=(t:number)=>t*t*(3-2*t)
  return (x:number,y:number)=>{
    const cx=Math.floor(x/step),cy=Math.floor(y/step)
    const i=(cy+1)*columns+cx+1,dx=smooth(x/step-cx),dy=smooth(y/step-cy)
    return mix(mix(grid[i],grid[i+1],dx),mix(grid[i+columns],grid[i+columns+1],dx),dy)
  }
}

export function terrain(){
  const pixels=document.createElement('canvas')
  pixels.width=width
  pixels.height=height
  const ctx=pixels.getContext('2d')!
  const rnd=generator(1917)
  const rect=(x:number,y:number,w:number,h:number,color:string)=>{
    ctx.fillStyle=color
    ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))
  }
  function poly(points:Pixel[],color:string){
    ctx.fillStyle=color
    ctx.beginPath()
    points.forEach(([x,y],i)=>i?ctx.lineTo(Math.round(x),Math.round(y)):ctx.moveTo(Math.round(x),Math.round(y)))
    ctx.closePath()
    ctx.fill()
  }
  function line(x:number,y:number,a:number,b:number,color:string,weight=1){
    ctx.strokeStyle=color
    ctx.lineWidth=weight
    ctx.beginPath()
    ctx.moveTo(Math.round(x)+.5,Math.round(y)+.5)
    ctx.lineTo(Math.round(a)+.5,Math.round(b)+.5)
    ctx.stroke()
  }

  const fine=grain(954,4),coarse=grain(723,27),cloud=grain(330,19)
  const sky=ctx.createImageData(width,height)
  // Broad, broken masses of rain cloud leave a strip of cold light near the skyline.
  for(let y=0;y<GROUND/scale+12;y++)for(let x=0;x<width;x++){
    const t=cap(y/(GROUND/scale)-.1)
    const field=cloud(x*.55,y*1.2)*.76+coarse(x*.8,y)*.24
    const lit=Math.round(cap((.57-field)*3)*6)*4+(fine(x,y)-.5)*4
    const i=(y*width+x)*4
    sky.data[i]=mix(40,141,t)+lit
    sky.data[i+1]=mix(60,149,t)+lit
    sky.data[i+2]=mix(72,146,t)+lit
    sky.data[i+3]=255
  }
  ctx.putImageData(sky,0,0)

  for(let i=0;i<3;i++){
    const ridge:Pixel[]=[[0,ground(0)]]
    for(let x=0;x<=width;x+=2){
      ridge.push([x,57+i*10+5*Math.sin(x*.032+i)+5*Math.cos(x*.013-i)+coarse(x,i*29)*13])
    }
    ridge.push([width,ground(width)])
    poly(ridge,['#849291','#717f7e','#657473'][i])
  }

  function tree(x:number,y:number,h:number,color:string,split:boolean){
    const lean=Math.round((rnd()-.5)*10)
    poly([[x-3,y],[x+lean*.2-1,y-h*.48],[x+lean-1,y-h],[x+lean+2,y-h*.94],[x+lean*.3+2,y-h*.49],[x+4,y]],color)
    for(let n=0;n<4;n++){
      const t=.34+n*.16,a=x+lean*t,b=y-h*t
      const stem=h*(n%2?-1:1)*(.12+rnd()*.14)
      line(a,b,a+stem,b-h*.15,color,split?2:1)
      line(a+stem,b-h*.15,a+stem*1.2,b-h*(.21+rnd()*.06),color)
      if(split)line(a+stem*.65,b-h*.09,a+stem*.47,b-h*.25,color)
    }
    if(split)line(x-1,y-1,x+lean*.4-1,y-h*.65,'#7c6b57')
  }
  for(let i=0;i<61;i++)tree(rnd()*width,74+rnd()*8,5+rnd()*10,'#697574',false)

  const brick=['#936b56','#96745f','#a0866e','#8b6454']
  function building(x:number,base:number,w:number,h:number,gap:number,distant=false){
    const top=base-h,east=x+w
    const masonry=distant?'#77776e':brick[Math.floor(rnd()*brick.length)]
    const shade=distant?'#666e6b':'#544d47'
    const slate=distant?'#626d6d':'#4b585b'
    const edge=distant?'#8a8578':'#bea083'
    const hole=distant?'#636962':'#374447'
    // Asymmetric wall, exposed rafters and a roof cut away by a collapse.
    poly([[x,base],[x,top+3],[x+4,top+1],[x+4,top-2],[x+gap,top-2],[x+gap+4,top+5],
      [east-7,top+4],[east-6,top+1],[east,top+5],[east,base]],masonry)
    poly([[east-6,top+1],[east,top+5],[east,base],[east-6,base]],shade)
    poly([[x-3,top+4],[x+gap*.48,top-8],[x+gap+1,top-2],[x+gap+4,top+3],[x+gap,top+1],[x+1,top+4]],slate)
    line(x+gap*.48,top-8,x+gap+4,top+3,edge)
    line(x-1,top+4,x+gap*.48,top-7,shade)
    for(let row=top+8;row<base;row+=4){
      for(let col=x+1;col<east-6;col+=6){
        const v=rnd()
        if(v>.39)rect(col+(row%3),row,2+Math.floor(v*2),1,v>.83?edge:shade)
      }
    }
    for(let side=x+5;side+3<east-5;side+=9){
      const high=top+6+Math.floor(rnd()*3)
      rect(side,high,3,5,hole)
      rect(side-1,high+5,5,1,edge)
      if(base-top>17){
        rect(side,high+10,3,5,hole)
        rect(side-1,high+15,5,1,edge)
      }
    }
    rect(x+w*.48,base-6,5,6,hole)
    for(let i=0;i<8;i++){
      const dx=x-4+rnd()*(w+9),dy=base-1+rnd()*3
      rect(dx,dy,2+rnd()*4,1+rnd()*2,i%3?shade:masonry)
    }
  }
  for(let i=0;i<18;i++){
    const x=194+i*14+rnd()*5
    building(x,74+rnd()*6,13+rnd()*13,7+rnd()*13,5+rnd()*3,true)
  }
  // The bell tower and its fractured spire anchor the skyline.
  const tx=312,ty=77
  poly([[tx-11,ty],[tx-11,43],[tx-8,43],[tx-8,37],[tx+10,37],[tx+10,43],[tx+14,43],[tx+14,ty]],'#937d6d')
  poly([[tx+5,37],[tx+10,37],[tx+10,43],[tx+14,43],[tx+14,ty],[tx+5,ty]],'#625d56')
  poly([[tx-10,38],[tx-1,14],[tx+1,19],[tx+1,23],[tx+3,22],[tx+3,26],[tx+7,29],[tx+10,37]],'#49575b')
  line(tx-10,37,tx-1,14,'#a09c90')
  rect(tx-11,42,26,2,'#5f5b52')
  for(const bx of [tx-7,tx]){
    poly([[bx,55],[bx,48],[bx+2,46],[bx+4,48],[bx+4,55]],'#3c4749')
    rect(bx-1,55,6,1,'#b4a28a')
  }
  for(let i=0;i<33;i++)rect(tx-10+rnd()*20,57+rnd()*19,1+rnd()*3,1,i%3?'#a28a73':'#625d56')
  building(266,82,31,17,11)
  building(335,82,32,24,12)
  building(296,83,33,13,9)
  building(222,82,30,22,14)
  building(376,82,28,18,9)
  building(411,83,21,16,12)

  for(const [x,h] of [[13,26],[122,29],[213,22],[250,36],[393,30],[424,42],[520,34],[623,26]]){
    tree(x,ground(x)+1,h,'#4c5046',true)
  }
  const lowRoad:Pixel[]=[[0,92]]
  for(let x=0;x<=width;x+=2)lowRoad.push([x,ground(x)-6-Math.round(fine(x,80)*3)])
  lowRoad.push([width,92])
  poly(lowRoad,'#626355')

  const soil=ctx.getImageData(0,0,width,height)
  for(let x=0;x<width;x++)for(let y=ground(x);y<height;y++){
    const depth=y-ground(x)
    const trace=y+Math.sin(x*.04)*3+Math.sin(x*.012)*9
    const stratum=Math.sin(trace*.22+coarse(x,y)*2)*1.9+Math.sin(trace*.54)*1.4
    const texture=(fine(x,y)-.5)*12+(coarse(x,y)-.5)*18+(rnd()-.5)*6+stratum
    const cut=y===ground(x)?9:0
    const top=cap(1-depth/78)
    const i=(y*width+x)*4
    soil.data[i]=36+top*32+texture+cut
    soil.data[i+1]=37+top*19+texture+cut
    soil.data[i+2]=34+top*10+texture+cut
    soil.data[i+3]=255
  }
  ctx.putImageData(soil,0,0)

  // Buried flint seams and roots follow short, interrupted, oblique traces.
  for(let i=0;i<156;i++){
    const x=Math.floor(rnd()*width),y=ground(x)+7+rnd()*(height-ground(x)-8)
    const len=5+rnd()*29,tilt=(rnd()-.4)*.22,color=i%3===0?'#545045':'#31322c'
    for(let j=0;j<len;j+=1+rnd()*3){
      if(rnd()>.29)rect(x+j,y+j*tilt+Math.sin(j*.3)*.8,1+rnd()*3,1,color)
    }
  }
  for(let i=0;i<350;i++){
    const x=rnd()*width,y=ground(x)+rnd()*10-4
    rect(x,y,1+rnd()*3,1,['#4a4a3c','#726a4e','#7c7961','#444e41'][i%4])
  }

  function crater(x:number,size:number){
    const y=ground(x),w=size*.5
    poly([[x-w-4,y],[x-w-1,y-2],[x-w+4,y-2],[x-w+5,y],[x+w-4,y],
      [x+w,y-2],[x+w+3,y],[x+w-3,y+2],[x+w-8,y+5],[x-w+7,y+5]],'#373a32')
    poly([[x-w+5,y+1],[x-w+10,y],[x+w-7,y],[x+w-3,y+1],[x+w-7,y+3],[x-w+9,y+3]],'#6e8585')
    rect(x-w+10,y+1,w*.92,1,'#9fa7a1')
    rect(x+w*.18,y+2,w*.47,1,'#798e8e')
    rect(x-w-1,y-2,5,1,'#877258')
    rect(x+w-1,y-2,2,1,'#88735a')
  }
  for(const [x,w] of [[106,18],[201,22],[235,20],[285,28],[321,39],[359,26],[411,24],[515,32],[589,13]])crater(x,w)

  // Tangled wire, snapped pickets and legs of duckboard stay below the skyline.
  for(const [x,l] of [[112,32],[197,34],[258,29],[346,40],[415,30],[505,37]]){
    const y=ground(x)-1
    for(const [a,b] of [[x,y-10],[x+l,y-8]]){
      line(a+1,y+2,a-2,b,'#403e37',2)
      rect(a-2,b,2,1,'#9b7352')
    }
    for(let i=0;i<l;i+=3){
      const h=Math.sin(i*.8)*2
      line(x+i,y-5+h,x+i+3,y-5+Math.sin((i+3)*.8)*2,'#424941')
      if(i%9===0)line(x+i,y-6+h,x+i+1,y-4+h,'#9f7958')
    }
  }
  for(const [x,len] of [[89,9],[119,10],[205,17],[254,12],[332,11],[480,10],[547,12],[588,10]]){
    const y=ground(x)
    line(x,y+2,x+len,y-4,'#484637',3)
    line(x,y+1,x+len,y-5,'#947b57')
    rect(x+len*.6,y-2,1,2,'#803e2e')
  }

  function bag(x:number,y:number,w=5){
    rect(x+1,y,w-2,1,'#b09c76')
    rect(x,y+1,w,2,'#8b8061')
    rect(x+1,y+3,w-2,1,'#686449')
    rect(x+w-2,y+2,1,1,'#5b624d')
  }
  for(const pos of HQ){
    const x=pos/scale,y=ground(x),isAllied=pos<W/2
    poly([[x-26,y],[x-23,y-8],[x-15,y-15],[x+13,y-15],[x+22,y-10],[x+27,y]],'#343b35')
    poly([[x-18,y-4],[x-12,y-12],[x+13,y-12],[x+20,y-7],[x+20,y-3]],'#62675a')
    for(let row=0;row<2;row++)for(let col=0;col<9-row*2;col++)bag(x-22+col*5+row*5,y-4-row*3)
    rect(x-11,y-10,20,5,'#292d2b')
    rect(x-9,y-9,15,1,'#c2a278')
    rect(x-12,y-12,24,2,'#777967')
    rect(x-4,y-16,8,2,isAllied?'#b6c590':'#d2937c')
    rect(x-23,y-2,6,2,'#566650')
  }
  for(const pos of [145,345,935,1135]){
    const x=pos/scale,y=ground(x)
    poly([[x-22,y-2],[x-17,y+2],[x-15,y+8],[x+15,y+8],[x+18,y+2],[x+22,y-2]],'#292d29')
    for(let i=-14;i<=14;i+=3){
      rect(x+i,y+1,2,6,'#665945')
      rect(x+i,y+1,1,5,'#9e8058')
    }
    for(let i=-3;i<=3;i++)bag(x+i*6-2,y-4,6)
    rect(x-15,y+7,30,1,'#6c5b43')
    rect(x-10,y+5,17,1,'#38382f')
  }

  const full=document.createElement('canvas')
  full.width=W
  full.height=H
  const final=full.getContext('2d')!
  final.imageSmoothingEnabled=false
  final.drawImage(pixels,0,0,W,H)
  return full
}
