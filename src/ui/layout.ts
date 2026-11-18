import {icon} from './icons'
import {rules, type Role} from '../game/config'

export const el=(id:string)=>document.getElementById(id)!
const cards=[
  ['infantry','Пехота'],['gun','Пулемёт'],['engineer','Инженеры'],['dig','Тоннели'],
  ['advance','В атаку'],['retreat','Отход'],['hold','В окоп'],['abilities','Поддержка']
]
function card([id,name]:string[],i:number){
  const costs=rules.recruits[id as Role]
  const detail=costs?icon('mp')+costs[0]+icon('sup')+costs[1]:''
  return `<button class="command" data-action="${id}"><span class="key">${i+1}</span>${icon(id)}
    <strong>${name}</strong>${detail?'<small>'+detail+'</small>':''}</button>`
}

export function layout(){
  el('app').innerHTML=`
<header>
  <div class="brand">${icon('crest')} UNDERFRONT</div>
  <div class="match-time"><span id="status"></span><b id="timer">00:00</b></div>
  <button id="pause" class="square" aria-label="Пауза">${icon('pause')}</button>
  <button id="manual" class="square" aria-label="Справка">${icon('book')}</button>
</header>
<main>
  <section class="board" aria-label="Поле боя">
    <div class="hud">
      <div class="resource">${icon('mp')}<span>Люди<b id="mp">48</b></span></div>
      <div class="resource">${icon('sup')}<span>Припасы<b id="sup">35</b></span></div>
      <div class="integrity ally"><span>Свой штаб <b id="ah">100%</b></span><meter id="am" max="100" value="100"></meter></div>
      <div class="integrity foe"><span>Штаб врага <b id="eh">100%</b></span><meter id="em" max="100" value="100"></meter></div>
    </div>
    <div class="map-toolbar">
      <div class="views" aria-label="Слой карты">
        <button data-view="overview">Обзор</button><button data-view="surface">Поверхность</button><button data-view="tunnels">Тоннели</button>
      </div>
      <div class="camera-controls">
        <button id="camera-left" class="square" aria-label="Карта левее">‹</button>
        <button id="camera-zoom" class="square" aria-label="Увеличить карту">+</button>
        <button id="camera-right" class="square" aria-label="Карта правее">›</button>
      </div>
    </div>
    <div id="field" aria-label="Карта боя">
      <div id="markers"></div>
    </div>
    <div class="mapfoot"><span id="context"></span><span id="map-position"></span></div>
  </section>
  <section class="console" aria-label="Приказы">
    <div class="commands">${cards.map(card).join('')}</div>
    <div id="powers" hidden></div>
    <div id="hint" role="status" hidden></div>
  </section>
  <section id="operations" hidden aria-labelledby="operations-heading">
    <div class="sectionhead"><h2 id="operations-heading">Подземные операции</h2><span id="crew"></span></div>
    <div id="targets" class="targets"></div>
    <div id="operation-detail" hidden>
      <div><strong id="operation-name"></strong><p id="operation-effect"></p><p id="operation-status"></p><progress id="operation-progress" max="1" hidden></progress></div>
      <button id="operation-confirm"></button><button id="operation-follow" hidden>К инженерам</button>
    </div>
  </section>
  <section class="feed"><h2>${icon('log')} Сводка</h2><div id="log"></div></section>
</main><dialog id="dialog"><div id="dialog-inner"></div></dialog>`
}
