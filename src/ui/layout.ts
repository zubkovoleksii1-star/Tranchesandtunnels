import {icon} from './icons'
import {rules} from '../game/config'
export const el=(id:string)=>document.getElementById(id)!
const cards=[['infantry','Infantry'],['gun','Machine gun'],['engineer','Engineers'],['dig','Dig tunnel'],['advance','Advance'],['retreat','Retreat'],['hold','Reinforce'],['abilities','Abilities']]
function card([id,name]:string[],i:number){
  const costs=rules.recruits[id as keyof typeof rules.recruits]
  const sub=costs?icon('mp')+costs[0]+' '+icon('sup')+costs[1]:id==='dig'?icon('sup')+rules.orderCost:({advance:'Push line',retreat:'Fall back',hold:'To trench',abilities:'Support'})[id]
  return '<button class="card '+(id==='dig'?'dig':'')+'" data-action="'+id+'"><span class="key">'+(i+1)+'</span>'+icon(id)+'<strong>'+name+'</strong><small>'+sub+'</small></button>'
}
export function layout(){
el('app').innerHTML=`
<header><div class="brand"><span class="crest">${icon('crest')}</span>UNDERFRONT</div><span class="division">TACTICAL COMMAND</span><div class="spacer"></div><button id="manual">${icon('book')} Field manual</button></header>
<main><section class="title"><div><div class="eyebrow"><i></i> WESTERN FRONT &nbsp; / &nbsp; SECTOR 04</div><h1>Trench Command</h1></div><div class="time"><span class="live" id="status">LIVE</span>${icon('clock')}<b id="timer">00:00</b><button id="pause" aria-label="Pause game">${icon('pause')}</button></div></section>
<section class="board"><div class="hud"><div class="resource">${icon('mp')}<span>Manpower<b id="mp">48</b></span></div><div class="resource">${icon('sup')}<span>Supplies<b id="sup">35</b></span></div><div class="spacer"></div><div class="integrity ally">Allied HQ <b id="ah">100%</b><meter id="am" max="100" value="100"></meter></div><div class="integrity foe">Enemy HQ <b id="eh">100%</b><meter id="em" max="100" value="100"></meter></div></div>
<div id="field" tabindex="0" aria-label="Battlefield. Select a trench or an underground excavation point."><span class="layer surface">01 / SURFACE</span><span class="layer underground">02 / SUBSURFACE</span><span class="maptag left">⚑ &nbsp;ALLIED HQ</span><span class="maptag right">ENEMY HQ &nbsp; ⚑</span><div id="trench-tags"></div></div>
<div class="mapfoot"><span><i class="allydot"></i>Allied &nbsp; <i class="foedot"></i>Enemy</span><span id="context">Selected · Forward trench</span></div></section>
<section class="console"><div class="sectionhead"><h2>Command deck</h2><small id="crew"></small></div><div class="cards">${cards.map(card).join('')}</div><div id="powers" hidden></div><div id="hint" role="status"></div></section>
<section class="feed"><h2>${icon('log')} Field log</h2><div id="log"></div></section></main><dialog id="dialog"><div id="dialog-inner"></div></dialog>`
}
