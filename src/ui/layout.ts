import {icon} from './icons'

export const el=(id:string)=>document.getElementById(id)!
const crest = new URL('./art/crest.png', import.meta.url).href
const wordmark = new URL('./art/wordmark.png', import.meta.url).href

export function layout(){
  el('app').innerHTML=`
<header>
  <div class="brand"><img class="insignia" src="${crest}" alt=""><img class="wordmark" src="${wordmark}" alt="UNDERFRONT"></div>
  <div class="match-time">${icon('clock')}<span id="status"></span><b id="timer">00:00</b></div>
  <button id="pause" class="square" aria-label="Пауза">${icon('pause')}</button>
  <button id="manual" class="square" aria-label="Справка">${icon('book')}</button>
</header>
<main>
  <section class="board" aria-label="Поле боя">
    <div class="hud">
      <div class="integrity ally"><span>Наш штаб <b id="ah">100%</b></span><meter id="am" aria-label="Прочность нашего штаба" max="100" value="100"></meter><small>Подземные цели <b id="allied-goals">0 / 3</b></small></div>
      <div class="integrity foe"><span>Штаб врага <b id="eh">100%</b></span><meter id="em" aria-label="Прочность штаба врага" max="100" value="100"></meter><small>Подземные цели <b id="enemy-goals">0 / 3</b></small></div>
      <div class="views" aria-label="Камера"><button data-view="follow" aria-pressed="true">За инженерами</button><button data-view="overview" aria-pressed="false">Весь фронт</button></div>
    </div>
    <div id="field" aria-label="Карта боя. Чтобы задать свой маршрут, нарисуй линию в грунте от инженера.">
      <div id="markers"><span id="dig-marker" class="marker" aria-hidden="true"></span></div>
    </div>
    <div class="mapfoot">
      <div class="objective"><span>${icon('target')} Ход союзников</span><strong id="map-guidance"></strong></div>
      <canvas id="route-profile" aria-label="Профиль маршрута. Золотая точка отмечает инженеров, ромбы — цели."></canvas>
    </div>
  </section>
  <section class="helm" aria-labelledby="helm-title">
    <div class="helm-info">
      <span class="bore-icon" aria-hidden="true"></span>
      <h1 id="helm-title">Инженеры союзников</h1>
      <span id="direction-status"></span><span class="separator" aria-hidden="true"> · </span><b id="dig-distance"></b>
    </div>
    <div class="route-actions">
      <button id="draw-route" aria-pressed="false">${icon('dig')} <span>Нарисовать ход</span></button>
      <button id="autopilot" hidden>Вернуть боту</button>
    </div>
    <p id="route-hint" role="status" hidden></p>
  </section>
  <section class="feed"><h2>${icon('log')} Сводка</h2><div id="log"></div></section>
</main><dialog id="dialog"><div id="dialog-inner"></div></dialog>`
}
