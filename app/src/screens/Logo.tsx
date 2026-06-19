import { GameIcon } from '../art/GameIcon'

// Герой: четыре авторские иконки игр, разложенные веером, как карты на руке.
const FAN: ('uno' | 'croco' | 'mafia' | 'pet')[] = ['croco', 'uno', 'mafia', 'pet']

export function HeroFan() {
  return (
    <div className="hero-fan" aria-label="Game is Game">
      {FAN.map((id, i) => (
        <div key={id} className={`hero-tile t${i}`}>
          <GameIcon id={id} size={70} />
        </div>
      ))}
    </div>
  )
}
