// Минималистичные чёрные иконки игр: единый стиль, тонкая чёрная линия,
// на светлой сиреневой плитке (.gi-ico в theme.css). Векторные глифы вместо
// эмодзи/маскотов, чтобы плитки выглядели одинаково на всех устройствах.

// Внутренняя разметка SVG для каждой игры (viewBox 0 0 24 24).
const ICONS: Record<string, string> = {
  maniac: "<path d='M13 5l6 6-7 7-3-3z'/><path d='M9 15l-4 4'/><path d='M5 15l4 4'/>",
  nitroliga: "<path d='M12 3c2.5 2 3.6 5.5 3.6 8.6L12 14l-3.6-2.4C8.4 8.5 9.5 5 12 3z'/><circle cx='12' cy='9' r='1.3' fill='#141018' stroke='none'/><path d='M8.4 12l-2 4 3-1.4M15.6 12l2 4-3-1.4'/>",
  neontide: "<path d='M4 15h16l-2.4 4H6.4z'/><path d='M12 4v9'/><path d='M12 5.2l5.4 6.3H12z'/>",
  chekharda: "<path d='M5 16h14M5 16l-.5-7 5 4 2.5-6 2.5 6 5-4-.5 7'/>",
  uno: "<rect x='4.5' y='7' width='9' height='12' rx='1.8'/><rect x='10.5' y='5' width='9' height='12' rx='1.8'/>",
  croco: "<path d='M5 6h14a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H10l-4 3v-3H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z'/><circle cx='9' cy='11' r='.6' fill='#141018' stroke='none'/><circle cx='12' cy='11' r='.6' fill='#141018' stroke='none'/><circle cx='15' cy='11' r='.6' fill='#141018' stroke='none'/>",
  mafia: "<path d='M18 15.5A7 7 0 1 1 12 5a5.5 5.5 0 0 0 6 10.5z'/>",
  saxalarm: "<path d='M7 15a5 5 0 0 1 10 0'/><path d='M6 15h12'/><path d='M12 5v1.6'/><path d='M11 18a1 1 0 0 0 2 0'/><path d='M5 6l2-1.6M19 6l-2-1.6'/>",
  pet: "<circle cx='9' cy='9' r='1.3'/><circle cx='15' cy='9' r='1.3'/><circle cx='6.7' cy='12.5' r='1.3'/><circle cx='17.3' cy='12.5' r='1.3'/><path d='M12 12.5c-2.4 0-3.8 1.7-3.8 3.4S9.7 19 12 19s3.8-1.4 3.8-3.1S14.4 12.5 12 12.5z'/>",
  kartishki: "<rect x='6' y='4.5' width='12' height='15' rx='2'/><path d='M12 8c-1.6 1.8-3 2.7-3 4.1A1.7 1.7 0 0 0 12 13a1.7 1.7 0 0 0 3-.9C15 10.7 13.6 9.8 12 8z'/><path d='M12 13v3'/>",
  slabo: "<path d='M10.5 4h3v2.4c0 .6.3 1 .8 1.6C15.5 9.4 16 10.7 16 12v6a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-6c0-1.3.5-2.6 1.7-4 .5-.6.8-1 .8-1.6V4z'/>",
  viktorina: "<path d='M9 15a5 5 0 1 1 6 0c-.6.5-1 1-1 1.8V17h-4v-.2c0-.8-.4-1.3-1-1.8z'/><path d='M10 19h4'/>",
  krot: "<circle cx='11' cy='11' r='5'/><path d='M15 15l4 4'/>",
  domino: "<rect x='6' y='4.5' width='12' height='15' rx='2'/><path d='M6 12h12'/><circle cx='10' cy='8.3' r='.7' fill='#141018' stroke='none'/><circle cx='14' cy='8.3' r='.7' fill='#141018' stroke='none'/><circle cx='12' cy='15.6' r='.7' fill='#141018' stroke='none'/>",
  loto: "<rect x='4' y='7' width='16' height='10' rx='2'/><path d='M9.5 7v10'/><circle cx='14.5' cy='12' r='1.4'/>",
  lesenki: "<path d='M8 4v16M16 4v16M8 8h8M8 12h8M8 16h8'/>",
  magnat: "<path d='M8 14V6a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v8'/><path d='M5 14.5h14'/><path d='M5 17.5h14'/>",
  morskoyboy: "<circle cx='12' cy='6' r='2'/><path d='M12 8v10'/><path d='M7 13a5 5 0 0 0 10 0'/><path d='M6 12.5h2M16 12.5h2'/>",
  mahjong: "<rect x='7' y='4' width='10' height='16' rx='2'/><path d='M12 8l2.2 4.2h-4.4z'/><path d='M9.6 15.5h4.8'/>",
  reversi: "<circle cx='12' cy='12' r='7'/><path d='M12 5a7 7 0 0 1 0 14z' fill='#141018' stroke='none'/>",
  pauk: "<circle cx='12' cy='12' r='3'/><path d='M9.2 10.5L5 7.5M9 12H4M9.2 13.5L5 16.5M14.8 10.5L19 7.5M15 12h5M14.8 13.5L19 16.5'/>",
  viselitsa: "<path d='M6 20V5h9'/><path d='M15 5v3'/><circle cx='15' cy='10' r='2'/>",
  bukvica: "<rect x='6' y='6' width='12' height='12' rx='2'/><path d='M10 15l2-6 2 6M10.7 13.2h2.6'/>",
  pletenka: "<path d='M4 9.5c2-2 4-2 6 0s4 2 6 0 4-2 4-2'/><path d='M4 14.5c2-2 4-2 6 0s4 2 6 0 4-2 4-2'/>",
  hrumik: "<path d='M19 8.2a7 7 0 1 0 0 7.6L14 12z'/><circle cx='15.5' cy='9.5' r='.8' fill='#141018' stroke='none'/>",
  puzyrik: "<circle cx='10' cy='13' r='4'/><circle cx='16.5' cy='8.5' r='2.4'/>",
  shaybus: "<ellipse cx='12' cy='10' rx='6' ry='2.6'/><path d='M6 10v3c0 1.4 2.7 2.6 6 2.6s6-1.2 6-2.6v-3'/>",
  duplet: "<circle cx='12' cy='12' r='7'/><circle cx='12' cy='12' r='2.6'/>",
  rikoshet: "<circle cx='12' cy='7' r='2'/><rect x='7' y='15' width='10' height='2.6' rx='1.3'/>",
  tanchiki: "<rect x='5' y='12.5' width='11' height='4' rx='1'/><path d='M8 12.5v-1.8h5v1.8'/><path d='M13 11.4h6'/><circle cx='7' cy='18' r='1'/><circle cx='11' cy='18' r='1'/><circle cx='15' cy='18' r='1'/>",
  zabava: "<path d='M12 4l2.2 5.5L20 10l-4.5 3.8L17 20l-5-3.3L7 20l1.5-6.2L4 10l5.8-.5z'/>",
  kletki: "<rect x='5' y='5' width='14' height='14' rx='1.5'/><path d='M5 9.7h14M5 14.3h14M9.7 5v14M14.3 5v14'/><rect x='9.7' y='5' width='4.6' height='4.7' fill='#141018' stroke='none'/>",
  kubik: "<rect x='6' y='6' width='12' height='12' rx='1.5'/><path d='M6 10h12M6 14h12M10 6v12M14 6v12'/>",
  linik: "<circle cx='6.5' cy='12' r='2'/><circle cx='12' cy='12' r='2'/><circle cx='17.5' cy='12' r='2'/>",
  skladik: "<rect x='6' y='6' width='12' height='12' rx='1.5'/><path d='M6 6l12 12M18 6L6 18'/>",
  ryad: "<rect x='5' y='5' width='14' height='14' rx='2'/><circle cx='9' cy='9' r='1.4'/><circle cx='15' cy='9' r='1.4'/><circle cx='9' cy='15' r='1.4'/><circle cx='15' cy='15' r='1.4' fill='#141018' stroke='none'/>",
  go: "<path d='M12 4v16M4 12h16'/><circle cx='12' cy='12' r='3' fill='#141018' stroke='none'/>",
  shogi: "<path d='M12 5l5 3v8H7V8z'/>",
  xiangqi: "<circle cx='12' cy='12' r='7'/><circle cx='12' cy='12' r='4.4'/>",
  legion: "<path d='M14.5 4.5l4 1.5-8.5 8.5-2-2z'/><path d='M8 14l-3 3M5.5 15l3 3'/>",
  natisk: "<path d='M7 4v16'/><path d='M7 5h9l-2 3 2 3H7'/>",
}

// Запасные глифы по жанру, если у игры нет своей иконки.
const CAT: Record<string, string> = {
  cards: "<rect x='4.5' y='7' width='9' height='12' rx='1.8'/><rect x='10.5' y='5' width='9' height='12' rx='1.8'/>",
  board: "<rect x='6' y='4.5' width='12' height='15' rx='2'/><path d='M6 12h12'/>",
  party: "<path d='M5 6h14a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H10l-4 3v-3H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z'/>",
  word: "<rect x='6' y='6' width='12' height='12' rx='2'/><path d='M10 15l2-6 2 6M10.7 13.2h2.6'/>",
  arcade: "<path d='M19 8.2a7 7 0 1 0 0 7.6L14 12z'/>",
  puzzle: "<rect x='6' y='6' width='12' height='12' rx='1.5'/><path d='M6 10h12M6 14h12M10 6v12M14 6v12'/>",
  strategy: "<path d='M14.5 4.5l4 1.5-8.5 8.5-2-2z'/><path d='M8 14l-3 3M5.5 15l3 3'/>",
  default: "<rect x='5' y='5' width='14' height='14' rx='3'/>",
}

export function GameTileIcon({ id, category, size = 62 }: { id: string; emoji?: string; category?: string; size?: number }) {
  const inner = ICONS[id] || (category && CAT[category]) || CAT.default
  return (
    <span className="gi-img gi-ico" style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 24 24" fill="none" stroke="#141018" strokeWidth={1.7}
        strokeLinecap="round" strokeLinejoin="round"
        dangerouslySetInnerHTML={{ __html: inner }}
      />
    </span>
  )
}
