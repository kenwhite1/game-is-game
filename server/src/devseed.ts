import { db } from './db'
import { DEV_MODE } from './auth'
import { getOrCreateUser } from './profiles'

// Демоданные ТОЛЬКО для локального DEV_MODE (нет BOT_TOKEN): несколько друзей,
// запуски игр и дружба с локальным игроком (id=1), чтобы соц-вкладки были живыми
// на скриншотах. В продакшене не выполняется никогда.
const DEMO = [
  { id: 9001, name: 'Аня', color: 'c_coral', face: 'f_cute', frame: 'frame_sakura', hat: 'hat_bow', eyewear: 'eye_shades', effect: 'fx_hearts', companion: 'comp_cat', banner: 'banner_sunset', opens: ['croco', 'pet', 'croco', 'uno', 'pet', 'croco'] },
  { id: 9002, name: 'Миша', color: 'c_sky', face: 'f_cool', frame: 'frame_neon', hat: 'hat_cap', eyewear: 'eye_goggles', effect: 'fx_bolt', companion: 'comp_robot', banner: 'banner_matrix', opens: ['mafia', 'uno', 'mafia', 'mafia'] },
  { id: 9003, name: 'Лена', color: 'c_lavender', face: 'f_starry', frame: 'frame_rainbow', hat: 'hat_crownhat', eyewear: 'eye_star', effect: 'fx_rainbow', companion: 'comp_unicorn', banner: 'banner_galaxy', opens: ['pet', 'pet', 'pet', 'pet', 'pet', 'croco', 'uno', 'mafia', 'pet'] },
  { id: 9004, name: 'Костя', color: 'c_emerald', face: 'f_angry', frame: 'frame_gold', hat: 'hat_tophat', eyewear: 'eye_monocle', effect: 'fx_flame', companion: 'comp_dragon', banner: 'banner_volcano', opens: ['uno', 'uno'] },
]

export function seedDev(): void {
  if (!DEV_MODE) return
  const already = db.prepare('SELECT 1 FROM friendships WHERE user_id=1 LIMIT 1').get()
  if (already) return

  getOrCreateUser(1, 'Dev')
  // Дадим локальному игроку историю, чтобы хаб не был пустым и часть косметики
  // уже открылась по уровню (≈ уровень 4 при 12 запусках).
  const me = ['croco', 'pet', 'uno', 'croco', 'pet', 'mafia', 'croco', 'pet', 'uno', 'croco', 'pet', 'mafia']
  for (const g of me) db.prepare('INSERT INTO opens (user_id, game_id) VALUES (1, ?)').run(g)
  // щедрый баланс Game, чтобы магазин был наглядным при локальной проверке
  db.prepare('UPDATE users SET opens=(SELECT COUNT(*) FROM opens WHERE user_id=1), coins=8000 WHERE id=1').run()

  const addFriend = db.prepare('INSERT OR IGNORE INTO friendships (user_id, friend_id) VALUES (?,?)')
  const addOpen = db.prepare('INSERT INTO opens (user_id, game_id) VALUES (?,?)')
  db.transaction(() => {
    for (const d of DEMO) {
      getOrCreateUser(d.id, d.name)
      db.prepare('UPDATE users SET color=?, face=?, frame=?, hat=?, eyewear=?, effect=?, companion=?, banner=?, opens=? WHERE id=?')
        .run(d.color, d.face, d.frame, d.hat, d.eyewear, d.effect, d.companion, d.banner, d.opens.length, d.id)
      for (const g of d.opens) addOpen.run(d.id, g)
      addFriend.run(1, d.id)
      addFriend.run(d.id, 1)
    }
    // Двое демодрузей «пришли по ссылке» локального игрока: карточка
    // приглашения и значок «Зазывала» видны сразу.
    db.prepare('UPDATE users SET referred_by=1 WHERE id IN (9001, 9002)').run()
  })()
  console.log(`dev seed: ${DEMO.length} demo friends for local user`)
}
