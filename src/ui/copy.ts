const messages:Record<string,string>={
  'Command link established. Both lines are holding.':'Связь установлена. Войска удерживают позиции.',
  'Insufficient resources.':'Не хватает ресурсов.',
  'Insufficient supplies.':'Не хватает припасов.',
  'Infantry squad deployed.':'Пехота выдвинулась из штаба.',
  'Machine gun team deployed.':'Пулемётный расчёт выдвинулся из штаба.',
  'Engineer team ready.':'Инженерная группа готова.',
  'Select a friendly trench.':'Выбери свой окоп на карте.',
  'Surface units advancing.':'Войска идут в атаку.',
  'Falling back to the rear line.':'Войска отходят в тыловой окоп.',
  'Units reinforcing the selected trench.':'Войска идут в выбранный окоп.',
  'Ability recharging.':'Поддержка ещё восстанавливается.',
  'Allied reserves mobilized.':'Союзники мобилизовали резерв.',
  'Enemy reserves mobilized.':'Противник мобилизовал резерв.',
  'Allied trench fortified.':'Свой окоп укреплён.',
  'Enemy trench fortified.':'Противник укрепил окоп.',
  'Allied artillery suppression active.':'Союзники вызвали артиллерию.',
  'Enemy artillery suppression active.':'Противник вызвал артиллерию.',
  'Tunnel contact! Allied engineers held the junction.':'Встреча под землёй. Наши инженеры удержали проход.',
  'Tunnel contact! Enemy engineers held the junction.':'Встреча под землёй. Противник удержал проход.'
}
export function translate(message:string){
  const capture=/^(Enemy|Allies) captured trench (\d+)\.$/.exec(message)
  if(capture)return (capture[1]==='Enemy'?'Противник захватил':'Союзники захватили')+' окоп '+capture[2]+'.'
  return messages[message]??message
}
