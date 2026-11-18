import {GROUND as g,H,W,generator} from '../game/config'
export const land=(x:number)=>g+3*Math.sin(x*.031)+2*Math.sin(x*.071)
export function terrain(){
  const c=document.createElement('canvas');c.width=W;c.height=H
  const p=c.getContext('2d')!,r=generator(1917)
  const rect=(x:number,y:number,w:number,h:number,color:string)=>{p.fillStyle=color;p.fillRect(x,y,w,h)}
  function line(x:number,y:number,a:number,b:number,color:string,width=1){p.strokeStyle=color;p.lineWidth=width;p.beginPath();p.moveTo(x,y);p.lineTo(a,b);p.stroke()}
  function poly(points:number[][],color:string){p.fillStyle=color;p.beginPath();points.forEach(([x,y],i)=>i?p.lineTo(x,y):p.moveTo(x,y));p.closePath();p.fill()}
  const sky=p.createLinearGradient(0,0,0,g);sky.addColorStop(0,'#707b78');sky.addColorStop(.7,'#b5b8a7');sky.addColorStop(1,'#ccbea1');p.fillStyle=sky;p.fillRect(0,0,W,g+10)
  for(let i=0;i<130;i++){const x=r()*W,y=r()*120;p.fillStyle='rgba(219,219,199,.065)';p.beginPath();p.ellipse(x,y,12+r()*95,2+r()*7,0,0,Math.PI*2);p.fill()}
  for(let j=0;j<4;j++){const ridge:number[][]=[[0,190]];for(let x=0;x<=W;x+=4){ridge.push([x,90+j*21+10*Math.sin(x*.009+j)+7*Math.cos(x*.023-j)+r()*3])}ridge.push([W,190]);poly(ridge,['#949e93','#828d80','#707a69','#565d4d'][j])}
  // Distant shattered village, spire and broken rooflines.
  for(let i=0;i<39;i++){const x=480+r()*260,y=122+r()*12,w=5+r()*16,h=5+r()*12;rect(x,y-h,w,h,'#778073');poly([[x-2,y-h],[x+w*.4,y-h-6],[x+w+1,y-h]],'#737d71');rect(x+w*.6,y-h+2,2,3,'#a5aa98')}
  rect(610,92,9,32,'#70796d');poly([[608,95],[614,70],[621,95]],'#70796d')
  function tree(x:number,y:number,h:number,col:string){
    const lean=(r()-.5)*12;poly([[x-3,y],[x+lean-1,y-h*.56],[x+lean+2,y-h],[x+lean+4,y-h*.94],[x+lean+2,y-h*.5],[x+3,y]],col)
    for(let i=0;i<5;i++){const k=.3+i*.13,dx=(i%2?1:-1)*h*(.08+r()*.15),a=x+lean*k,b=y-h*k;line(a,b,a+dx,b-h*.14,col,2.2);line(a+dx,b-h*.14,a+dx*1.3,b-h*.27,col,1.3)}
  }
  for(let i=0;i<75;i++)tree(r()*W,145+r()*10,10+r()*21,'#778071')
  for(const x of [26,224,436,502,765,839,1032,1257])tree(x,land(x),30+r()*40,'#484c40')
  for(let j=0;j<7;j++){const x=365+j*88+r()*23,y=land(x)-1;line(x,y,x-4,y-17,'#4e4d41',3);line(x+50,y,x+53,y-14,'#4e4d41',2);for(let i=0;i<20;i++){const a=x+i*2.6,b=y-8-3*Math.cos(i*.42);line(a,b,a+3,b+Math.sin(i)*2,'#56584a');if(i%3===0)line(a-2,b-2,a+2,b+2,'#56584a')}}
  const soil=p.createLinearGradient(0,g,0,H);soil.addColorStop(0,'#594d3b');soil.addColorStop(.22,'#413a2e');soil.addColorStop(.6,'#302e25');soil.addColorStop(1,'#242720')
  p.beginPath();p.moveTo(0,H);for(let x=0;x<=W;x+=2)p.lineTo(x,land(x));p.lineTo(W,H);p.fillStyle=soil;p.fill()
  for(let j=0;j<105;j++){
    const x=r()*W,y=g+8+r()*(H-g),len=20+r()*160
    p.beginPath();p.moveTo(x,y);p.bezierCurveTo(x+len*.4,y-3,x+len*.65,y+10,x+len,y+4);p.lineWidth=.4+r()*3;p.strokeStyle=r()<.5?'rgba(173,147,104,.10)':'rgba(12,17,15,.15)';p.stroke()
  }
  for(let i=0;i<22000;i++){const x=r()*W,y=r()*H;rect(x,y,r()*2.2+.4,r()+.3,r()<.5?'rgba(16,21,14,.1)':'rgba(223,214,178,.09)')}
  for(let i=0;i<2300;i++){const x=r()*W,y=land(x)+r()*8;rect(x,y,r()*5,1+r()*2,r()<.5?'#625945':'#393a2e')}
  for(const x of [65,1215]){
    const y=land(x),isAllied=x<W/2
    poly([[x-49,y],[x-45,y-15],[x-34,y-23],[x-19,y-33],[x+27,y-33],[x+43,y-19],[x+49,y]],'#30392c')
    poly([[x-35,y-7],[x-26,y-28],[x+25,y-28],[x+35,y-17],[x+37,y-7]],'#667055')
    for(let j=0;j<4;j++)for(let k=0;k<8-j;k++){
      const a=x-43+k*11+j*5,b=y-6-j*5
      rect(a,b,10,5,'#697056');rect(a+1,b,8,1,'#9b9a76')
    }
    rect(x-16,y-20,32,10,'#292f25')
    rect(x-13,y-17,24,3,'#cfb476')
    rect(x-6,y-36,12,4,isAllied?'#c0d49d':'#f0a58c')
  }
  for(const x of [145,345,935,1135]){
    const y=land(x)
    poly([[x-42,y-3],[x-33,y+5],[x-29,y+15],[x+29,y+15],[x+34,y+5],[x+42,y-3]],'#20271e')
    for(let i=-25;i<27;i+=6){
      rect(x+i,y+1,3,13,'#695b42');rect(x+i+1,y+2,1,10,'#a08455')
    }
    rect(x-29,y+13,58,2,'#534733')
    for(let i=-4;i<=4;i++){
      const sandbag=x+i*8
      rect(sandbag,y-6,8,5,'#88816a');rect(sandbag+1,y-6,6,1,'#bab096')
    }
    rect(x-22,y+3,44,2,'#262e24')
  }
  return c
}
