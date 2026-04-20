import initSqlJs, { Database as SqlJsDatabase } from 'sql.js'
import { join, dirname } from 'path'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const dataDir = join(__dirname, '../../data')
const dbPath = join(dataDir, 'idol-game.db')

// Ensure data directory exists
mkdirSync(dataDir, { recursive: true })

let db: SqlJsDatabase | null = null
let dbInitPromise: Promise<SqlJsDatabase> | null = null

export async function initDb(): Promise<SqlJsDatabase> {
  if (db) return db
  if (dbInitPromise) return dbInitPromise

  dbInitPromise = (async () => {
    const SQL = await initSqlJs()

    // Load existing database or create new one
    try {
      const fileBuffer = readFileSync(dbPath)
      db = new SQL.Database(fileBuffer)
    } catch {
      db = new SQL.Database()
    }

    // Create tables
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    db.run(`
      CREATE TABLE IF NOT EXISTS characters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        rarity TEXT NOT NULL CHECK (rarity IN ('N', 'R', 'SR', 'SSR', 'UR')),
        image_path TEXT NOT NULL,
        description TEXT,
        voice_lines TEXT DEFAULT '[]',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    db.run(`
      CREATE TABLE IF NOT EXISTS user_characters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        character_id TEXT NOT NULL,
        fragment_count INTEGER DEFAULT 0,
        intimacy_level INTEGER DEFAULT 1,
        level INTEGER DEFAULT 1,
        exp INTEGER DEFAULT 0,
        skill_level INTEGER DEFAULT 1,
        obtained_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (character_id) REFERENCES characters(character_id)
      )
    `)

    db.run(`
      CREATE TABLE IF NOT EXISTS user_support_slots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        slot_index INTEGER NOT NULL,
        character_id TEXT,
        last_collected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `)

    db.run(`
      CREATE TABLE IF NOT EXISTS user_intimacy_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        character_id TEXT NOT NULL,
        last_intimacy_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `)

    db.run(`
      CREATE TABLE IF NOT EXISTS user_gacha_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        character_id TEXT NOT NULL,
        gacha_type TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `)

    db.run(`
      CREATE TABLE IF NOT EXISTS user_currency (
        user_id INTEGER PRIMARY KEY,
        holy_stone INTEGER DEFAULT 5000,
        summon_ticket INTEGER DEFAULT 10,
        stamina INTEGER DEFAULT 100,
        max_stamina INTEGER DEFAULT 100,
        last_stamina_update DATETIME DEFAULT CURRENT_TIMESTAMP,
        pity_count INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `)

    db.run(`
      CREATE TABLE IF NOT EXISTS friends (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        friend_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, friend_id)
      )
    `)

    db.run(`
      CREATE TABLE IF NOT EXISTS friend_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_user_id INTEGER NOT NULL,
        to_user_id INTEGER NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `)

    db.run(`
      CREATE TABLE IF NOT EXISTS stamina_gifts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER NOT NULL,
        receiver_id INTEGER NOT NULL,
        amount INTEGER DEFAULT 10,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        received_at DATETIME,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `)

    db.run(`
      CREATE TABLE IF NOT EXISTS character_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        character_id TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (character_id) REFERENCES characters(character_id)
      )
    `)

    db.run(`
      CREATE TABLE IF NOT EXISTS daily_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_key TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        target INTEGER DEFAULT 1,
        reward_type TEXT NOT NULL,
        reward_amount INTEGER NOT NULL,
        reset_daily BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    db.run(`
      CREATE TABLE IF NOT EXISTS user_daily_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        task_id INTEGER NOT NULL,
        progress INTEGER DEFAULT 0,
        claimed BOOLEAN DEFAULT FALSE,
        date DATE NOT NULL,
        claimed_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (task_id) REFERENCES daily_tasks(id) ON DELETE CASCADE,
        UNIQUE(user_id, task_id, date)
      )
    `)

    db.run(`
      CREATE TABLE IF NOT EXISTS achievements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        achievement_key TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        condition_type TEXT NOT NULL,
        condition_value INTEGER NOT NULL,
        reward_type TEXT NOT NULL,
        reward_amount INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    db.run(`
      CREATE TABLE IF NOT EXISTS user_achievements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        achievement_id INTEGER NOT NULL,
        progress INTEGER DEFAULT 0,
        unlocked BOOLEAN DEFAULT FALSE,
        claimed BOOLEAN DEFAULT FALSE,
        unlocked_at DATETIME,
        claimed_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
        UNIQUE(user_id, achievement_id)
      )
    `)

    // Create indexes
    db.run('CREATE INDEX IF NOT EXISTS idx_user_characters_user_id ON user_characters(user_id)')
    db.run('CREATE INDEX IF NOT EXISTS idx_user_gacha_records_user_id ON user_gacha_records(user_id)')
    db.run('CREATE INDEX IF NOT EXISTS idx_user_gacha_records_user_created ON user_gacha_records(user_id, created_at)')
    db.run('CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id)')
    db.run('CREATE INDEX IF NOT EXISTS idx_stamina_gifts_receiver ON stamina_gifts(receiver_id)')
    db.run('CREATE INDEX IF NOT EXISTS idx_user_daily_progress_user_date ON user_daily_progress(user_id, date)')
    db.run('CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id)')

    // Idol weekly support tables
    db.run(`
      CREATE TABLE IF NOT EXISTS idol_weekly_support (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        amount INTEGER NOT NULL DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(character_id, user_id)
      )
    `)

    db.run(`
      CREATE TABLE IF NOT EXISTS idol_support_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        amount INTEGER NOT NULL,
        week_start DATE NOT NULL,
        week_end DATE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    db.run(`
      CREATE TABLE IF NOT EXISTS support_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        character_id TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        amount INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Monthly pass tables
    db.run(`
      CREATE TABLE IF NOT EXISTS user_pass (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,
        pass_type TEXT DEFAULT 'monthly',
        activated_at DATETIME NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    db.run(`
      CREATE TABLE IF NOT EXISTS pass_daily_claims (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        claim_date DATE NOT NULL,
        pass_type TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, claim_date, pass_type)
      )
    `)

    db.run(`
      CREATE TABLE IF NOT EXISTS pass_missions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mission_key TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        target INTEGER DEFAULT 1,
        target_type TEXT NOT NULL,
        reward_type TEXT NOT NULL,
        reward_amount INTEGER NOT NULL,
        bonus_reward_type TEXT,
        bonus_reward_amount INTEGER,
        pass_type TEXT DEFAULT 'monthly',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    db.run(`
      CREATE TABLE IF NOT EXISTS user_pass_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        mission_id INTEGER NOT NULL,
        progress INTEGER DEFAULT 0,
        claimed BOOLEAN DEFAULT FALSE,
        pass_type TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, mission_id, pass_type)
      )
    `)

    // Migration: add pity_count column to user_currency for existing databases
    try {
      db.run("ALTER TABLE user_currency ADD COLUMN pity_count INTEGER DEFAULT 0")
    } catch (e: any) {
      if (!e.message?.includes('duplicate column name')) {
        // Column might already exist from previous partial migration, that's OK
      }
    }

    // Migration: add voice_lines column to characters for existing databases
    try {
      db.run("ALTER TABLE characters ADD COLUMN voice_lines TEXT DEFAULT '[]'")
    } catch (e: any) {
      if (!e.message?.includes('duplicate column name')) {
        // Column might already exist from previous partial migration, that's OK
      }
    }

    // Backfill voice_lines for existing character records
    const VOICE_LINES_BACKFILL: Record<string, string> = {
      'star_01': '[{"milestone":2,"category":"voice","lines":["今天的星星也格外闪耀呢~","我会继续努力的，请多关照！"]},{"milestone":5,"category":"action","trigger":"shake","lines":["嘿嘿，被你发现了我的小秘密~"]},{"milestone":6,"category":"action","trigger":"blush","lines":["被...被你看穿了，好害羞呀..."]},{"milestone":7,"category":"action","trigger":"wave","lines":["挥挥手~希望你今天也开心！"]},{"milestone":8,"category":"story","title":"第一章：星之国的约定","content":"在遥远的星之国，有个小小的见习偶像。她每天都仰望夜空，对最亮的那颗星星许愿——总有一天，她要站上最闪耀的舞台。"},{"milestone":10,"category":"voice_full","lines":["谢谢你一直陪着我！我们一起去看星星吧，今晚的星空特别美哦~","我最开心的事情，就是能和你一起分享星光！"]}]',
      'star_02': '[{"milestone":2,"category":"voice","lines":["晚安~今晚的月色真美呢。","你的陪伴，让我感到很安心。"]},{"milestone":5,"category":"action","trigger":"shake","lines":["呀！吓我一跳~"]},{"milestone":6,"category":"action","trigger":"blush","lines":["那个...这样夸我的话，我会害羞的..."]},{"milestone":7,"category":"action","trigger":"wave","lines":["晚安~下次再来看月亮吧！"]},{"milestone":8,"category":"story","title":"第一章：月下的歌声","content":"月野美月是月光下诞生的温柔少女。她的歌声能洗净一切悲伤，每个月圆之夜，她都会在窗边轻声吟唱。"},{"milestone":10,"category":"voice_full","lines":["能听到你的声音，是我最幸福的事情。","无论发生什么，我都会在这里，为你歌唱。"]}]',
      'sun_01': '[{"milestone":2,"category":"voice","lines":["早安！今天也要充满活力地加油哦~","嘿嘿，看到你的笑容我就开心！"]},{"milestone":5,"category":"action","trigger":"shake","lines":["哦呀？发现什么有趣的事情了吗？"]},{"milestone":6,"category":"action","trigger":"blush","lines":["嘿嘿，夸奖收到~有点不好意思呢"]},{"milestone":7,"category":"action","trigger":"wave","lines":["给~这是我的招牌加油动作！"]},{"milestone":8,"category":"story","title":"第一章：阳光般的梦想","content":"日向美玲是阳光的化身，她的笑容比任何聚光灯都要耀眼。但在她大大咧咧的外表下，藏着一颗细腻温暖的心。"},{"milestone":10,"category":"voice_full","lines":["有你在身边，每一天都像在过节！","我们的舞台会越来越大的，一起冲向巅峰吧！"]}]',
      'sun_02': '[{"milestone":2,"category":"voice","lines":["风会带来好消息~比如我的歌声！","想不想和我一起追逐风的方向？"]},{"milestone":5,"category":"action","trigger":"shake","lines":["嘻嘻，抓住风的感觉~"]},{"milestone":6,"category":"action","trigger":"blush","lines":["和风一样...有点难以捉摸呢"]},{"milestone":7,"category":"action","trigger":"wave","lines":["随风而去~一起飞翔吧！"]},{"milestone":8,"category":"story","title":"第一章：风的轨迹","content":"风中璃绪是风的精灵，她的舞台是整个天空。没有人知道她从哪里来，但每个人都被她自由的身影所吸引。"},{"milestone":10,"category":"voice_full","lines":["和你在一起的时光，比风还要快呢~","我的风会永远环绕着你，就像你的支持环绕着我一样！"]}]',
      'moon_01': '[{"milestone":2,"category":"voice","lines":["你...愿意听我唱歌吗？","这份温暖，希望你能感受到。"]},{"milestone":5,"category":"action","trigger":"shake","lines":["冰晶在颤抖呢..."]},{"milestone":6,"category":"action","trigger":"blush","lines":["不...不要靠得太近..."]},{"milestone":7,"category":"action","trigger":"wave","lines":["再见...下次再来找我吧"]},{"milestone":8,"category":"story","title":"第一章：冰雪的王冠","content":"雪宫静是冰雪王国的女王，表面冷艳高傲，内心却藏着不为人知的温柔。她的歌声是冰与火的交融，让人既敬畏又沉醉。"},{"milestone":10,"category":"voice_full","lines":["你让我明白了，冰雪也可以融化。","这一路走来，只有你看到了真正的我。"]}]',
      'galaxy_01': '[{"milestone":2,"category":"voice","lines":["银河的光芒，正在注视着你哦~","我的舞蹈，是星星们的低语。"]},{"milestone":5,"category":"action","trigger":"shake","lines":["星星们也在跳动呢~"]},{"milestone":6,"category":"action","trigger":"blush","lines":["和星星一起...有点害羞"]},{"milestone":7,"category":"action","trigger":"wave","lines":["来，和我一起漫步星河~"]},{"milestone":8,"category":"story","title":"第一章：银河的访客","content":"星野美羽来自银河最深处，她的身体由星光编织而成。每当她起舞，夜空就会多出一条璀璨的星河。"},{"milestone":10,"category":"voice_full","lines":["你是我见过的，最温暖的星光。","愿我的星河，永远为你闪耀。"]}]',
      'galaxy_02': '[{"milestone":2,"category":"voice","lines":["宇宙的尽头有什么呢...我想和你一起去找答案。","每颗星星都有一个故事，你是第几颗？"]},{"milestone":5,"category":"action","trigger":"shake","lines":["穿越星际的震动~"]},{"milestone":6,"category":"action","trigger":"blush","lines":["那个...你真的愿意陪我飞向宇宙吗？"]},{"milestone":7,"category":"action","trigger":"wave","lines":["银河之旅，随时出发！"]},{"milestone":8,"category":"story","title":"第一章：星际穿越者","content":"夜空遥香是一个星际旅行家，她的飞船是用流星制成的。她穿越无数星系，只为寻找能与她共鸣的灵魂。"},{"milestone":10,"category":"voice_full","lines":["有了你，宇宙不再是孤独的。","我们的故事，会成为星空中最美的传说。"]}]',
      'cosmic_01': '[{"milestone":2,"category":"voice","lines":["你相信流星的传说吗？","我的眼泪...是为理解我的人而流的。"]},{"milestone":5,"category":"action","trigger":"shake","lines":["呜...别看我哭啦，但是...是幸福的眼泪。"]},{"milestone":6,"category":"action","trigger":"blush","lines":["划过天际的瞬间...我也想被你看见"]},{"milestone":7,"category":"action","trigger":"wave","lines":["流星的尾巴...是在挥手告别吗？"]},{"milestone":8,"category":"story","title":"第一章：彗星的誓约","content":"流星美月是彗星化身的传说偶像。每当她划过夜空，所有人都会许下愿望。而她的愿望，只有一个——找到一个真心爱她的人。"},{"milestone":10,"category":"voice_full","lines":["谢谢你接受了我所有的眼泪和笑容。","我愿为你，燃烧一生一次的璀璨。"]}]',
      'cosmic_02': '[{"milestone":2,"category":"voice","lines":["极光是大地的梦境，我是梦的化身~","看我跳舞的时候...你在想什么呢？"]},{"milestone":5,"category":"action","trigger":"shake","lines":["极光在震颤呢~"]},{"milestone":6,"category":"action","trigger":"blush","lines":["第一次...被人这样注视"]},{"milestone":7,"category":"action","trigger":"wave","lines":["这一支舞，只为你一个人而跳。"]},{"milestone":8,"category":"story","title":"第一章：极光的颜色","content":"极光彼方是极光幻化的梦幻偶像，没有人见过她的真面目，因为她有千万种色彩。每一种色彩，都是一种情感的绽放。"},{"milestone":10,"category":"voice_full","lines":["你是第一个，看懂我所有颜色的人。","我们的羁绊，比极光还要绚烂，比梦境还要真实。"]}]',
      'eternal_01': '[{"milestone":2,"category":"voice","lines":["你的心...我听到了。","这首歌，是为你而唱的第一个音符。"]},{"milestone":5,"category":"action","trigger":"shake","lines":["千年的岁月...轻轻晃动"]},{"milestone":6,"category":"action","trigger":"blush","lines":["原来被理解，是这样的感觉啊..."]},{"milestone":7,"category":"action","trigger":"wave","lines":["这一舞...为你而跳"]},{"milestone":8,"category":"story","title":"第一章：永恒的序章","content":"神崎诗织是传唱千年的歌姬，她的歌声能治愈万物，也能毁灭一切。在无尽的岁月里，她一直在等待一个能听懂她歌声的灵魂。"},{"milestone":10,"category":"voice_full","lines":["千年的等待，终于有了答案。","愿我的歌声，永远陪伴着你，直到永恒。"]}]',
      'eternal_02': '[{"milestone":2,"category":"voice","lines":["星辰为我烙印，传说因你而生。","这一舞，是永恒与你的约定。"]},{"milestone":5,"category":"action","trigger":"shake","lines":["星辰在轨道上轻轻摇晃~"]},{"milestone":6,"category":"action","trigger":"blush","lines":["指尖的星光...是你的倒影吗"]},{"milestone":7,"category":"action","trigger":"wave","lines":["你看到了吗？星辰在我的指尖舞动~"]},{"milestone":8,"category":"story","title":"第一章：星辰之舞","content":"神崎舞妃是星辰塑造的舞者，她的每一个动作都被刻入星空。万年之间，她独舞于宇宙之间，直到有一天，她的心被一个凡人的目光所俘获。"},{"milestone":10,"category":"voice_full","lines":["你是我舞蹈的唯一观众，也是永恒的意义。","愿我们的舞步，永远同步，直到星辰陨落。"]}]',
    }

    for (const [charId, voiceLineJson] of Object.entries(VOICE_LINES_BACKFILL)) {
      db.prepare("UPDATE characters SET voice_lines = ? WHERE character_id = ?").run([voiceLineJson, charId])
    }

    // Rhythm game tables
    db.run(`
      CREATE TABLE IF NOT EXISTS rhythm_songs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        song_key TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        difficulty INTEGER DEFAULT 2,
        bpm INTEGER DEFAULT 120,
        notes_data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    db.run(`
      CREATE TABLE IF NOT EXISTS rhythm_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        song_id INTEGER NOT NULL,
        score INTEGER DEFAULT 0,
        perfect_count INTEGER DEFAULT 0,
        great_count INTEGER DEFAULT 0,
        good_count INTEGER DEFAULT 0,
        miss_count INTEGER DEFAULT 0,
        max_combo INTEGER DEFAULT 0,
        grade TEXT DEFAULT 'D',
        played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (song_id) REFERENCES rhythm_songs(id)
      )
    `)

    db.run(`
      CREATE TABLE IF NOT EXISTS rhythm_user_stats (
        user_id INTEGER NOT NULL,
        song_id INTEGER NOT NULL,
        best_score INTEGER DEFAULT 0,
        best_grade TEXT DEFAULT 'D',
        play_count INTEGER DEFAULT 0,
        PRIMARY KEY (user_id, song_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (song_id) REFERENCES rhythm_songs(id)
      )
    `)

    // Rhythm game indexes
    db.run('CREATE INDEX IF NOT EXISTS idx_rhythm_scores_user_id ON rhythm_scores(user_id)')
    db.run('CREATE INDEX IF NOT EXISTS idx_rhythm_scores_song_id ON rhythm_scores(song_id)')

    // Backfill pity_count for existing users from their actual gacha record count
    db.run(`
      UPDATE user_currency
      SET pity_count = (
        SELECT COUNT(*) FROM user_gacha_records
        WHERE user_gacha_records.user_id = user_currency.user_id
      )
      WHERE pity_count = 0 OR pity_count IS NULL
    `)

    // Seed characters
    const INITIAL_CHARACTERS = [
      { character_id: 'star_01', name: '星野梦', rarity: 'N', image_path: '/resources/characters/star_01.png', description: '来自星之国的见习偶像，梦想是成为最闪亮的星星。', voice_lines: '[{"milestone":2,"category":"voice","lines":["今天的星星也格外闪耀呢~","我会继续努力的，请多关照！"]},{"milestone":5,"category":"action","trigger":"shake","lines":["嘿嘿，被你发现了我的小秘密~"]},{"milestone":8,"category":"story","title":"第一章：星之国的约定","content":"在遥远的星之国，有个小小的见习偶像。她每天都仰望夜空，对最亮的那颗星星许愿——总有一天，她要站上最闪耀的舞台。"},{"milestone":10,"category":"voice_full","lines":["谢谢你一直陪着我！我们一起去看星星吧，今晚的星空特别美哦~","我最开心的事情，就是能和你一起分享星光！"]}]' },
      { character_id: 'star_02', name: '月见光', rarity: 'N', image_path: '/resources/characters/star_02.png', description: '月光下的温柔少女，歌声如月光般清澈。', voice_lines: '[{"milestone":2,"category":"voice","lines":["晚安~今晚的月色真美呢。","你的陪伴，让我感到很安心。"]},{"milestone":5,"category":"action","trigger":"blush","lines":["那个...这样夸我的话，我会害羞的..."]},{"milestone":8,"category":"story","title":"第一章：月下的歌声","content":"月野美月是月光下诞生的温柔少女。她的歌声能洗净一切悲伤，每个月圆之夜，她都会在窗边轻声吟唱。"},{"milestone":10,"category":"voice_full","lines":["能听到你的声音，是我最幸福的事情。","无论发生什么，我都会在这里，为你歌唱。"]}]' },
      { character_id: 'sun_01', name: '日向暖', rarity: 'R', image_path: '/resources/characters/sun_01.png', description: '充满阳光气息的活力偶像，总能给人带来好心情。', voice_lines: '[{"milestone":2,"category":"voice","lines":["早安！今天也要充满活力地加油哦~","嘿嘿，看到你的笑容我就开心！"]},{"milestone":5,"category":"action","trigger":"wave","lines":["给~这是我的招牌加油动作！"]},{"milestone":8,"category":"story","title":"第一章：阳光般的梦想","content":"日向美玲是阳光的化身，她的笑容比任何聚光灯都要耀眼。但在她大大咧咧的外表下，藏着一颗细腻温暖的心。"},{"milestone":10,"category":"voice_full","lines":["有你在身边，每一天都像在过节！","我们的舞台会越来越大的，一起冲向巅峰吧！"]}]' },
      { character_id: 'sun_02', name: '风见郎', rarity: 'R', image_path: '/resources/characters/sun_02.png', description: '自由奔放的的风系偶像，舞台风格独具一格。', voice_lines: '[{"milestone":2,"category":"voice","lines":["风会带来好消息~比如我的歌声！","想不想和我一起追逐风的方向？"]},{"milestone":5,"category":"action","trigger":"shake","lines":["嘻嘻，抓住风的感觉~"]},{"milestone":8,"category":"story","title":"第一章：风的轨迹","content":"风中璃绪是风的精灵，她的舞台是整个天空。没有人知道她从哪里来，但每个人都被她自由的身影所吸引。"},{"milestone":10,"category":"voice_full","lines":["和你在一起的时光，比风还要快呢~","我的风会永远环绕着你，就像你的支持环绕着我一样！"]}]' },
      { character_id: 'moon_01', name: '雪之下', rarity: 'R', image_path: '/resources/characters/moon_01.png', description: '冷艳高贵的雪之女王，歌声却温暖人心。', voice_lines: '[{"milestone":2,"category":"voice","lines":["你...愿意听我唱歌吗？","这份温暖，希望你能感受到。"]},{"milestone":5,"category":"action","trigger":"blush","lines":["不...不要靠得太近..."]},{"milestone":8,"category":"story","title":"第一章：冰雪的王冠","content":"雪宫静是冰雪王国的女王，表面冷艳高傲，内心却藏着不为人知的温柔。她的歌声是冰与火的交融，让人既敬畏又沉醉。"},{"milestone":10,"category":"voice_full","lines":["你让我明白了，冰雪也可以融化。","这一路走来，只有你看到了真正的我。"]}]' },
      { character_id: 'galaxy_01', name: '银河美', rarity: 'SR', image_path: '/resources/characters/galaxy_01.png', description: '来自银河深处的神秘偶像，舞步如同星河流转。', voice_lines: '[{"milestone":2,"category":"voice","lines":["银河的光芒，正在注视着你哦~","我的舞蹈，是星星们的低语。"]},{"milestone":5,"category":"action","trigger":"wave","lines":["来，和我一起漫步星河~"]},{"milestone":8,"category":"story","title":"第一章：银河的访客","content":"星野美羽来自银河最深处，她的身体由星光编织而成。每当她起舞，夜空就会多出一条璀璨的星河。"},{"milestone":10,"category":"voice_full","lines":["你是我见过的，最温暖的星光。","愿我的星河，永远为你闪耀。"]}]' },
      { character_id: 'galaxy_02', name: '宇宙遥', rarity: 'SR', image_path: '/resources/characters/galaxy_02.png', description: '追逐宇宙梦想的偶像，每一次演出都是星际穿越。', voice_lines: '[{"milestone":2,"category":"voice","lines":["宇宙的尽头有什么呢...我想和你一起去找答案。","每颗星星都有一个故事，你是第几颗？"]},{"milestone":5,"category":"action","trigger":"blush","lines":["那个...你真的愿意陪我飞向宇宙吗？"]},{"milestone":8,"category":"story","title":"第一章：星际穿越者","content":"夜空遥香是一个星际旅行家，她的飞船是用流星制成的。她穿越无数星系，只为寻找能与她共鸣的灵魂。"},{"milestone":10,"category":"voice_full","lines":["有了你，宇宙不再是孤独的。","我们的故事，会成为星空中最美的传说。"]}]' },
      { character_id: 'cosmic_01', name: '彗星泪', rarity: 'SSR', image_path: '/resources/characters/cosmic_01.png', description: '传说中彗星化身的偶像，她的眼泪能实现愿望。', voice_lines: '[{"milestone":2,"category":"voice","lines":["你相信流星的传说吗？","我的眼泪...是为理解我的人而流的。"]},{"milestone":5,"category":"action","trigger":"shake","lines":["呜...别看我哭啦，但是...是幸福的眼泪。"]},{"milestone":8,"category":"story","title":"第一章：彗星的誓约","content":"流星美月是彗星化身的传说偶像。每当她划过夜空，所有人都会许下愿望。而她的愿望，只有一个——找到一个真心爱她的人。"},{"milestone":10,"category":"voice_full","lines":["谢谢你接受了我所有的眼泪和笑容。","我愿为你，燃烧一生一次的璀璨。"]}]' },
      { character_id: 'cosmic_02', name: '极光恋', rarity: 'SSR', image_path: '/resources/characters/cosmic_02.png', description: '极光般绚烂的梦幻偶像，舞蹈如极光般美丽。', voice_lines: '[{"milestone":2,"category":"voice","lines":["极光是大地的梦境，我是梦的化身~","看我跳舞的时候...你在想什么呢？"]},{"milestone":5,"category":"action","trigger":"wave","lines":["这一支舞，只为你一个人而跳。"]},{"milestone":8,"category":"story","title":"第一章：极光的颜色","content":"极光彼方是极光幻化的梦幻偶像，没有人见过她的真面目，因为她有千万种色彩。每一种色彩，都是一种情感的绽放。"},{"milestone":10,"category":"voice_full","lines":["你是第一个，看懂我所有颜色的人。","我们的羁绊，比极光还要绚烂，比梦境还要真实。"]}]' },
      { character_id: 'eternal_01', name: '永恒歌', rarity: 'UR', image_path: '/resources/characters/eternal_01.png', description: '传说中的歌姬，她的歌声能穿越时空，感动万物。', voice_lines: '[{"milestone":2,"category":"voice","lines":["你的心...我听到了。","这首歌，是为你而唱的第一个音符。"]},{"milestone":5,"category":"action","trigger":"blush","lines":["原来被理解，是这样的感觉啊..."]},{"milestone":8,"category":"story","title":"第一章：永恒的序章","content":"神崎诗织是传唱千年的歌姬，她的歌声能治愈万物，也能毁灭一切。在无尽的岁月里，她一直在等待一个能听懂她歌声的灵魂。"},{"milestone":10,"category":"voice_full","lines":["千年的等待，终于有了答案。","愿我的歌声，永远陪伴着你，直到永恒。"]}]' },
      { character_id: 'eternal_02', name: '永恒舞', rarity: 'UR', image_path: '/resources/characters/eternal_02.png', description: '永恒的舞者传说，她的舞蹈被刻在星辰之上。', voice_lines: '[{"milestone":2,"category":"voice","lines":["星辰为我烙印，传说因你而生。","这一舞，是永恒与你的约定。"]},{"milestone":5,"category":"action","trigger":"wave","lines":["你看到了吗？星辰在我的指尖舞动~"]},{"milestone":8,"category":"story","title":"第一章：星辰之舞","content":"神崎舞妃是星辰塑造的舞者，她的每一个动作都被刻入星空。万年之间，她独舞于宇宙之间，直到有一天，她的心被一个凡人的目光所俘获。"},{"milestone":10,"category":"voice_full","lines":["你是我舞蹈的唯一观众，也是永恒的意义。","愿我们的舞步，永远同步，直到星辰陨落。"]}]' },
    ]

    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO characters (character_id, name, rarity, image_path, description, voice_lines)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    for (const char of INITIAL_CHARACTERS) {
      insertStmt.run([char.character_id, char.name, char.rarity, char.image_path, char.description, char.voice_lines])
    }
    insertStmt.free()

    // Seed daily tasks
    const DAILY_TASKS = [
      { task_key: 'login', title: '每日登录', description: '登录游戏', target: 1, reward_type: 'holy_stone', reward_amount: 20 },
      { task_key: 'gacha_single', title: '单抽达人', description: '单抽1次', target: 1, reward_type: 'summon_ticket', reward_amount: 1 },
      { task_key: 'gacha_multi', title: '十连召唤', description: '十连抽卡1次', target: 1, reward_type: 'holy_stone', reward_amount: 50 },
      { task_key: 'send_stamina', title: '友情馈赠', description: '赠送体力给好友', target: 1, reward_type: 'holy_stone', reward_amount: 15 },
      { task_key: 'interact', title: '偶像互动', description: '与角色互动1次', target: 1, reward_type: 'fragment', reward_amount: 3 },
      { task_key: 'rhythm_play', title: '节奏游戏', description: '演奏任意歌曲1次', target: 1, reward_type: 'holy_stone', reward_amount: 30 },
    ]

    const dailyStmt = db.prepare(`
      INSERT OR IGNORE INTO daily_tasks (task_key, title, description, target, reward_type, reward_amount)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    for (const task of DAILY_TASKS) {
      dailyStmt.run([task.task_key, task.title, task.description, task.target, task.reward_type, task.reward_amount])
    }
    dailyStmt.free()

    // Seed achievements
    const ACHIEVEMENTS = [
      { achievement_key: 'first_gacha', title: '初出茅庐', description: '首次抽卡', icon: 'gacha', condition_type: 'gacha_count', condition_value: 1, reward_type: 'holy_stone', reward_amount: 50 },
      { achievement_key: 'gacha_10', title: '召唤新手', description: '累计抽卡10次', icon: 'gacha', condition_type: 'gacha_count', condition_value: 10, reward_type: 'summon_ticket', reward_amount: 3 },
      { achievement_key: 'gacha_100', title: '召唤达人', description: '累计抽卡100次', icon: 'gacha', condition_type: 'gacha_count', condition_value: 100, reward_type: 'character_ticket_sr', reward_amount: 1 },
      { achievement_key: 'collect_5', title: '偶像收集', description: '拥有5个不同角色', icon: 'collect', condition_type: 'character_count', condition_value: 5, reward_type: 'holy_stone', reward_amount: 100 },
      { achievement_key: 'collect_10', title: '偶像收藏家', description: '拥有10个不同角色', icon: 'collect', condition_type: 'character_count', condition_value: 10, reward_type: 'character_ticket_ur', reward_amount: 1 },
      { achievement_key: 'login_7', title: '连续登录', description: '连续登录7天', icon: 'login', condition_type: 'login_days', condition_value: 7, reward_type: 'summon_ticket', reward_amount: 5 },
      { achievement_key: 'login_30', title: '忠实粉丝', description: '连续登录30天', icon: 'login', condition_type: 'login_days', condition_value: 30, reward_type: 'character_ticket_ur', reward_amount: 1 },
      { achievement_key: 'friend_10', title: '社交达人', description: '拥有10个好友', icon: 'friend', condition_type: 'friend_count', condition_value: 10, reward_type: 'holy_stone', reward_amount: 200 },
      { achievement_key: 'rhythm_first', title: '初登舞台', description: '完成首次演奏', icon: 'rhythm', condition_type: 'rhythm_count', condition_value: 1, reward_type: 'holy_stone', reward_amount: 30 },
      { achievement_key: 'rhythm_10', title: '舞台新星', description: '累计演奏10次', icon: 'rhythm', condition_type: 'rhythm_count', condition_value: 10, reward_type: 'holy_stone', reward_amount: 100 },
    ]

    const achievementStmt = db.prepare(`
      INSERT OR IGNORE INTO achievements (achievement_key, title, description, icon, condition_type, condition_value, reward_type, reward_amount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    for (const ach of ACHIEVEMENTS) {
      achievementStmt.run([ach.achievement_key, ach.title, ach.description, ach.icon, ach.condition_type, ach.condition_value, ach.reward_type, ach.reward_amount])
    }
    achievementStmt.free()

    // Seed pass missions
    const PASS_MISSIONS = [
      // Free tier missions
      { mission_key: 'pass_login', title: '通行证登录', description: '每日登录游戏', target: 1, target_type: 'login', reward_type: 'holy_stone', reward_amount: 30, pass_type: 'monthly' },
      { mission_key: 'pass_gacha', title: '通行证抽卡', description: '进行任意抽卡1次', target: 1, target_type: 'gacha', reward_type: 'holy_stone', reward_amount: 30, pass_type: 'monthly' },
      { mission_key: 'pass_friend', title: '通行证好友', description: '赠送体力给好友', target: 1, target_type: 'send_stamina', reward_type: 'holy_stone', reward_amount: 30, pass_type: 'monthly' },
      // VIP tier missions (bonus rewards)
      { mission_key: 'pass_vip_login', title: '高级通行证登录', description: '每日登录游戏', target: 1, target_type: 'login', reward_type: 'summon_ticket', reward_amount: 1, bonus_reward_type: 'holy_stone', bonus_reward_amount: 70, pass_type: 'monthly' },
      { mission_key: 'pass_vip_gacha', title: '高级通行证抽卡', description: '进行任意抽卡1次', target: 1, target_type: 'gacha', reward_type: 'summon_ticket', reward_amount: 1, bonus_reward_type: 'holy_stone', bonus_reward_amount: 70, pass_type: 'monthly' },
      { mission_key: 'pass_vip_friend', title: '高级通行证好友', description: '赠送体力给好友', target: 1, target_type: 'send_stamina', reward_type: 'summon_ticket', reward_amount: 1, bonus_reward_type: 'holy_stone', bonus_reward_amount: 70, pass_type: 'monthly' },
      { mission_key: 'pass_vip_support', title: '高级通行证应援', description: '为偶像应援1次', target: 1, target_type: 'support', reward_type: 'summon_ticket', reward_amount: 1, bonus_reward_type: 'holy_stone', bonus_reward_amount: 70, pass_type: 'monthly' },
    ]

    const passMissionStmt = db.prepare(`
      INSERT OR IGNORE INTO pass_missions (mission_key, title, description, target, target_type, reward_type, reward_amount, bonus_reward_type, bonus_reward_amount, pass_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    for (const m of PASS_MISSIONS) {
      passMissionStmt.run([m.mission_key, m.title, m.description, m.target, m.target_type, m.reward_type, m.reward_amount, m.bonus_reward_type || null, m.bonus_reward_amount || null, m.pass_type])
    }
    passMissionStmt.free()

    // Seed rhythm songs (notes_data: {time: ms, lane: 0|1|2})
    const RHYTHM_SONGS = [
      {
        song_key: 'starlight_melody',
        title: '星光旋律',
        difficulty: 2,
        bpm: 120,
        notes_data: JSON.stringify([
          // Intro - simple beats (every 1000ms)
          { time: 1000, lane: 1 }, { time: 2000, lane: 0 }, { time: 3000, lane: 2 },
          { time: 4000, lane: 1 }, { time: 5000, lane: 0 }, { time: 6000, lane: 2 },
          // Verse 1 - alternating pattern (every 1000ms)
          { time: 7000, lane: 0 }, { time: 8000, lane: 1 }, { time: 9000, lane: 2 },
          { time: 10000, lane: 1 }, { time: 11000, lane: 0 }, { time: 12000, lane: 2 },
          { time: 13000, lane: 1 }, { time: 14000, lane: 0 }, { time: 15000, lane: 1 },
          { time: 16000, lane: 2 }, { time: 17000, lane: 1 }, { time: 18000, lane: 0 },
          // Chorus - still comfortable (every 500ms)
          { time: 19000, lane: 0 }, { time: 19500, lane: 2 }, { time: 20000, lane: 1 },
          { time: 20500, lane: 0 }, { time: 21000, lane: 2 }, { time: 21500, lane: 1 },
          { time: 22000, lane: 0 }, { time: 22500, lane: 2 }, { time: 23000, lane: 1 },
          { time: 24000, lane: 2 }, { time: 25000, lane: 0 }, { time: 26000, lane: 1 },
          // Bridge
          { time: 27000, lane: 1 }, { time: 28000, lane: 0 }, { time: 29000, lane: 2 },
          { time: 30000, lane: 1 }, { time: 31000, lane: 0 }, { time: 32000, lane: 2 },
          // Final chorus
          { time: 33000, lane: 0 }, { time: 33500, lane: 1 }, { time: 34000, lane: 2 },
          { time: 34500, lane: 1 }, { time: 35000, lane: 0 }, { time: 36000, lane: 2 },
          { time: 37000, lane: 1 }, { time: 38000, lane: 0 }, { time: 39000, lane: 1 },
        ])
      },
      {
        song_key: 'heartbeat_rhythm',
        title: '心跳节拍',
        difficulty: 3,
        bpm: 140,
        notes_data: JSON.stringify([
          // Intro (every 800ms)
          { time: 1000, lane: 1 }, { time: 1800, lane: 0 }, { time: 2600, lane: 2 },
          { time: 3400, lane: 1 }, { time: 4200, lane: 0 }, { time: 5000, lane: 2 },
          // Verse - syncopated (every 600ms)
          { time: 6000, lane: 0 }, { time: 6600, lane: 1 }, { time: 7200, lane: 2 },
          { time: 7800, lane: 0 }, { time: 8400, lane: 1 }, { time: 9000, lane: 2 },
          { time: 9600, lane: 1 }, { time: 10200, lane: 0 }, { time: 10800, lane: 1 },
          { time: 11400, lane: 2 }, { time: 12000, lane: 1 }, { time: 12600, lane: 0 },
          // Pre-chorus buildup (every 400ms)
          { time: 13400, lane: 0 }, { time: 13800, lane: 1 }, { time: 14200, lane: 2 },
          { time: 14600, lane: 0 }, { time: 15000, lane: 1 }, { time: 15400, lane: 2 },
          { time: 15800, lane: 0 }, { time: 16200, lane: 1 }, { time: 16600, lane: 2 },
          // Chorus - moderate (every 300ms)
          { time: 17400, lane: 0 }, { time: 17700, lane: 1 }, { time: 18000, lane: 2 },
          { time: 18300, lane: 1 }, { time: 18600, lane: 0 }, { time: 18900, lane: 2 },
          { time: 19200, lane: 0 }, { time: 19500, lane: 1 }, { time: 19800, lane: 2 },
          { time: 20100, lane: 1 }, { time: 20400, lane: 0 }, { time: 20700, lane: 2 },
          { time: 21000, lane: 1 }, { time: 21300, lane: 0 }, { time: 21600, lane: 1 },
          { time: 21900, lane: 2 }, { time: 22200, lane: 1 }, { time: 22500, lane: 0 },
          // Break
          { time: 23400, lane: 1 }, { time: 24600, lane: 0 }, { time: 25800, lane: 2 },
          { time: 27000, lane: 1 }, { time: 28200, lane: 0 }, { time: 29400, lane: 2 },
          // Final chorus
          { time: 30600, lane: 0 }, { time: 30900, lane: 2 }, { time: 31200, lane: 1 },
          { time: 31500, lane: 0 }, { time: 31800, lane: 2 }, { time: 32100, lane: 1 },
          { time: 32400, lane: 0 }, { time: 32700, lane: 2 }, { time: 33000, lane: 1 },
          { time: 33300, lane: 0 }, { time: 33600, lane: 1 }, { time: 33900, lane: 2 },
          { time: 34200, lane: 1 }, { time: 34500, lane: 0 }, { time: 34800, lane: 1 },
          { time: 35400, lane: 0 }, { time: 36000, lane: 2 }, { time: 36600, lane: 1 },
        ])
      },
      {
        song_key: 'mania_stage',
        title: '狂热舞台',
        difficulty: 4,
        bpm: 160,
        notes_data: JSON.stringify([
          // Intro (every 600ms)
          { time: 1000, lane: 0 }, { time: 1600, lane: 1 }, { time: 2200, lane: 2 },
          { time: 2800, lane: 0 }, { time: 3400, lane: 1 }, { time: 4000, lane: 2 },
          { time: 4600, lane: 1 }, { time: 5200, lane: 0 }, { time: 5800, lane: 1 },
          { time: 6400, lane: 2 }, { time: 7000, lane: 0 }, { time: 7600, lane: 1 },
          // Verse 1 (every 400ms)
          { time: 8400, lane: 0 }, { time: 8800, lane: 1 }, { time: 9200, lane: 2 },
          { time: 9600, lane: 1 }, { time: 10000, lane: 0 }, { time: 10400, lane: 2 },
          { time: 10800, lane: 0 }, { time: 11200, lane: 1 }, { time: 11600, lane: 2 },
          { time: 12000, lane: 1 }, { time: 12400, lane: 0 }, { time: 12800, lane: 1 },
          // Chorus - challenging (every 250ms)
          { time: 13600, lane: 0 }, { time: 13850, lane: 1 }, { time: 14100, lane: 2 },
          { time: 14350, lane: 2 }, { time: 14600, lane: 1 }, { time: 14850, lane: 0 },
          { time: 15100, lane: 0 }, { time: 15350, lane: 1 }, { time: 15600, lane: 2 },
          { time: 15850, lane: 1 }, { time: 16100, lane: 0 }, { time: 16350, lane: 2 },
          { time: 16600, lane: 0 }, { time: 16850, lane: 2 }, { time: 17100, lane: 1 },
          { time: 17350, lane: 0 }, { time: 17600, lane: 2 }, { time: 17850, lane: 1 },
          // Intense section (every 200ms)
          { time: 18400, lane: 0 }, { time: 18600, lane: 0 }, { time: 18800, lane: 1 },
          { time: 19000, lane: 1 }, { time: 19200, lane: 2 }, { time: 19400, lane: 2 },
          { time: 19600, lane: 0 }, { time: 19800, lane: 1 }, { time: 20000, lane: 2 },
          { time: 20200, lane: 0 }, { time: 20400, lane: 1 }, { time: 20600, lane: 2 },
          // Bridge - speed burst (every 200ms)
          { time: 21200, lane: 0 }, { time: 21400, lane: 1 }, { time: 21600, lane: 2 },
          { time: 21800, lane: 0 }, { time: 22000, lane: 1 }, { time: 22200, lane: 2 },
          { time: 22400, lane: 1 }, { time: 22600, lane: 0 }, { time: 22800, lane: 1 },
          { time: 23000, lane: 2 }, { time: 23200, lane: 1 }, { time: 23400, lane: 0 },
          // Final rush (every 250ms)
          { time: 24000, lane: 0 }, { time: 24250, lane: 1 }, { time: 24500, lane: 2 },
          { time: 24750, lane: 0 }, { time: 25000, lane: 1 }, { time: 25250, lane: 2 },
          { time: 25500, lane: 1 }, { time: 25750, lane: 0 }, { time: 26000, lane: 1 },
          { time: 26250, lane: 2 }, { time: 26500, lane: 0 }, { time: 26750, lane: 2 },
          { time: 27000, lane: 1 }, { time: 27250, lane: 0 }, { time: 27500, lane: 2 },
          { time: 27750, lane: 1 }, { time: 28000, lane: 0 }, { time: 28500, lane: 1 },
          // Outro
          { time: 29400, lane: 1 }, { time: 30600, lane: 0 }, { time: 31800, lane: 2 },
          { time: 33000, lane: 1 }, { time: 34200, lane: 0 }, { time: 35400, lane: 2 },
          { time: 36600, lane: 0 }, { time: 37200, lane: 1 }, { time: 37800, lane: 2 },
          { time: 38400, lane: 1 }, { time: 39000, lane: 0 }, { time: 40200, lane: 1 },
        ])
      },
      {
        // === Easy (difficulty 1) ===
        song_key: 'moonlight_waltz',
        title: '月光华尔兹',
        difficulty: 1,
        bpm: 100,
        notes_data: JSON.stringify([
          // Very slow, simple (every 1500ms)
          { time: 1000, lane: 1 }, { time: 2500, lane: 0 }, { time: 4000, lane: 2 },
          { time: 5500, lane: 1 }, { time: 7000, lane: 2 }, { time: 8500, lane: 0 },
          { time: 10000, lane: 1 }, { time: 11500, lane: 0 }, { time: 13000, lane: 2 },
          { time: 14500, lane: 1 }, { time: 16000, lane: 0 }, { time: 17500, lane: 2 },
          { time: 19000, lane: 1 }, { time: 20500, lane: 1 }, { time: 22000, lane: 0 },
          { time: 23500, lane: 2 }, { time: 25000, lane: 1 }, { time: 26500, lane: 0 },
          { time: 28000, lane: 2 }, { time: 29500, lane: 1 }, { time: 31000, lane: 0 },
          { time: 32500, lane: 2 }, { time: 34000, lane: 1 }, { time: 35500, lane: 1 },
          { time: 37000, lane: 0 }, { time: 38500, lane: 2 }, { time: 40000, lane: 1 },
        ])
      },
      {
        song_key: 'dreamy_lullaby',
        title: '梦幻摇篮曲',
        difficulty: 1,
        bpm: 90,
        notes_data: JSON.stringify([
          // Very slow single notes (every 2000ms then 1000ms)
          { time: 1000, lane: 0 }, { time: 3000, lane: 1 }, { time: 5000, lane: 2 },
          { time: 7000, lane: 1 }, { time: 9000, lane: 0 }, { time: 11000, lane: 2 },
          { time: 13000, lane: 0 }, { time: 15000, lane: 1 }, { time: 17000, lane: 2 },
          { time: 19000, lane: 1 }, { time: 21000, lane: 0 }, { time: 23000, lane: 2 },
          { time: 25000, lane: 0 }, { time: 25500, lane: 1 }, { time: 26000, lane: 2 },
          { time: 28000, lane: 1 }, { time: 30000, lane: 0 }, { time: 32000, lane: 2 },
          { time: 34000, lane: 1 }, { time: 36000, lane: 0 }, { time: 38000, lane: 1 },
          { time: 40000, lane: 2 }, { time: 42000, lane: 1 }, { time: 44000, lane: 0 },
        ])
      },
      {
        // === Normal (difficulty 2) - 2 new songs to pair with starlight_melody
        song_key: 'summer_breeze',
        title: '夏日微风',
        difficulty: 2,
        bpm: 120,
        notes_data: JSON.stringify([
          // Intro
          { time: 1000, lane: 1 }, { time: 2000, lane: 0 }, { time: 3000, lane: 2 },
          { time: 4000, lane: 1 }, { time: 5000, lane: 0 }, { time: 6000, lane: 2 },
          // Pattern section
          { time: 7500, lane: 0 }, { time: 8500, lane: 1 }, { time: 9500, lane: 2 },
          { time: 10500, lane: 2 }, { time: 11500, lane: 1 }, { time: 12500, lane: 0 },
          { time: 13500, lane: 1 }, { time: 14500, lane: 2 }, { time: 15500, lane: 0 },
          { time: 16500, lane: 1 }, { time: 17500, lane: 0 }, { time: 18500, lane: 2 },
          // Faster chorus
          { time: 20000, lane: 0 }, { time: 20750, lane: 1 }, { time: 21500, lane: 2 },
          { time: 22250, lane: 1 }, { time: 23000, lane: 0 }, { time: 23750, lane: 2 },
          { time: 24500, lane: 1 }, { time: 25250, lane: 0 }, { time: 26000, lane: 1 },
          { time: 26750, lane: 2 }, { time: 27500, lane: 0 }, { time: 28250, lane: 1 },
          // Cool down
          { time: 30000, lane: 1 }, { time: 31500, lane: 0 }, { time: 33000, lane: 2 },
          { time: 34500, lane: 1 }, { time: 36000, lane: 0 }, { time: 37500, lane: 2 },
          // Final
          { time: 39000, lane: 0 }, { time: 39750, lane: 1 }, { time: 40500, lane: 2 },
          { time: 41250, lane: 1 }, { time: 42000, lane: 0 }, { time: 43000, lane: 1 },
        ])
      },
      {
        song_key: 'neon_night',
        title: '霓虹之夜',
        difficulty: 2,
        bpm: 125,
        notes_data: JSON.stringify([
          // Intro (every 1000ms)
          { time: 1000, lane: 0 }, { time: 2000, lane: 2 }, { time: 3000, lane: 1 },
          { time: 4000, lane: 0 }, { time: 5000, lane: 2 }, { time: 6000, lane: 1 },
          // Syncopated
          { time: 7500, lane: 1 }, { time: 8500, lane: 0 }, { time: 9500, lane: 2 },
          { time: 10500, lane: 0 }, { time: 11500, lane: 1 }, { time: 12500, lane: 2 },
          { time: 13500, lane: 2 }, { time: 14500, lane: 0 }, { time: 15500, lane: 1 },
          // Chorus
          { time: 17000, lane: 0 }, { time: 17750, lane: 2 }, { time: 18500, lane: 1 },
          { time: 19250, lane: 0 }, { time: 20000, lane: 2 }, { time: 20750, lane: 1 },
          { time: 21500, lane: 1 }, { time: 22250, lane: 0 }, { time: 23000, lane: 2 },
          { time: 23750, lane: 1 }, { time: 24500, lane: 2 }, { time: 25250, lane: 0 },
          // Bridge
          { time: 27000, lane: 0 }, { time: 28000, lane: 1 }, { time: 29000, lane: 2 },
          { time: 30000, lane: 1 }, { time: 31000, lane: 0 }, { time: 32000, lane: 2 },
          // Final rush
          { time: 33500, lane: 0 }, { time: 34000, lane: 1 }, { time: 34500, lane: 2 },
          { time: 35000, lane: 0 }, { time: 35500, lane: 1 }, { time: 36000, lane: 2 },
          { time: 36500, lane: 1 }, { time: 37000, lane: 0 }, { time: 38000, lane: 1 },
          { time: 39000, lane: 0 }, { time: 40000, lane: 2 }, { time: 41000, lane: 1 },
        ])
      },
      {
        // === Hard (difficulty 3) - 2 new songs to pair with heartbeat/mania
        song_key: 'storm_rider',
        title: '风暴骑士',
        difficulty: 3,
        bpm: 155,
        notes_data: JSON.stringify([
          // Fast intro (every 400ms)
          { time: 1000, lane: 0 }, { time: 1400, lane: 1 }, { time: 1800, lane: 2 },
          { time: 2200, lane: 1 }, { time: 2600, lane: 0 }, { time: 3000, lane: 1 },
          { time: 3400, lane: 2 }, { time: 3800, lane: 1 }, { time: 4200, lane: 0 },
          // Verse
          { time: 4800, lane: 0 }, { time: 5100, lane: 2 }, { time: 5400, lane: 1 },
          { time: 5700, lane: 0 }, { time: 6000, lane: 2 }, { time: 6300, lane: 1 },
          { time: 6600, lane: 1 }, { time: 6900, lane: 0 }, { time: 7200, lane: 2 },
          { time: 7500, lane: 1 }, { time: 7800, lane: 2 }, { time: 8100, lane: 0 },
          // Chorus - intense (every 200ms)
          { time: 8800, lane: 0 }, { time: 9000, lane: 1 }, { time: 9200, lane: 2 },
          { time: 9400, lane: 1 }, { time: 9600, lane: 0 }, { time: 9800, lane: 2 },
          { time: 10000, lane: 0 }, { time: 10200, lane: 2 }, { time: 10400, lane: 1 },
          { time: 10600, lane: 1 }, { time: 10800, lane: 0 }, { time: 11000, lane: 2 },
          { time: 11200, lane: 0 }, { time: 11400, lane: 1 }, { time: 11600, lane: 2 },
          { time: 11800, lane: 2 }, { time: 12000, lane: 1 }, { time: 12200, lane: 0 },
          // Speed burst
          { time: 12800, lane: 0 }, { time: 13000, lane: 0 }, { time: 13200, lane: 1 },
          { time: 13400, lane: 1 }, { time: 13600, lane: 2 }, { time: 13800, lane: 2 },
          { time: 14000, lane: 0 }, { time: 14200, lane: 1 }, { time: 14400, lane: 2 },
          { time: 14600, lane: 0 }, { time: 14800, lane: 1 }, { time: 15000, lane: 2 },
          // Final
          { time: 15600, lane: 0 }, { time: 15800, lane: 2 }, { time: 16000, lane: 1 },
          { time: 16200, lane: 0 }, { time: 16400, lane: 1 }, { time: 16600, lane: 2 },
          { time: 16800, lane: 1 }, { time: 17000, lane: 0 }, { time: 17400, lane: 2 },
          { time: 17800, lane: 1 }, { time: 18200, lane: 0 }, { time: 18600, lane: 1 },
          { time: 19000, lane: 2 }, { time: 19400, lane: 0 }, { time: 19800, lane: 1 },
        ])
      },
      {
        song_key: 'cyber_pulse',
        title: '赛博脉冲',
        difficulty: 3,
        bpm: 150,
        notes_data: JSON.stringify([
          // Intro
          { time: 1000, lane: 1 }, { time: 1500, lane: 0 }, { time: 2000, lane: 2 },
          { time: 2500, lane: 1 }, { time: 3000, lane: 0 }, { time: 3500, lane: 2 },
          { time: 4000, lane: 0 }, { time: 4500, lane: 1 }, { time: 5000, lane: 2 },
          // Verse - alternating
          { time: 6000, lane: 0 }, { time: 6400, lane: 1 }, { time: 6800, lane: 2 },
          { time: 7200, lane: 2 }, { time: 7600, lane: 1 }, { time: 8000, lane: 0 },
          { time: 8400, lane: 1 }, { time: 8800, lane: 0 }, { time: 9200, lane: 2 },
          { time: 9600, lane: 0 }, { time: 10000, lane: 2 }, { time: 10400, lane: 1 },
          // Chorus
          { time: 11200, lane: 0 }, { time: 11450, lane: 1 }, { time: 11700, lane: 2 },
          { time: 11950, lane: 1 }, { time: 12200, lane: 0 }, { time: 12450, lane: 2 },
          { time: 12700, lane: 0 }, { time: 12950, lane: 2 }, { time: 13200, lane: 1 },
          { time: 13450, lane: 1 }, { time: 13700, lane: 0 }, { time: 13950, lane: 2 },
          { time: 14200, lane: 0 }, { time: 14450, lane: 1 }, { time: 14700, lane: 2 },
          { time: 14950, lane: 2 }, { time: 15200, lane: 1 }, { time: 15450, lane: 0 },
          // Intense
          { time: 16000, lane: 0 }, { time: 16200, lane: 0 }, { time: 16400, lane: 1 },
          { time: 16600, lane: 1 }, { time: 16800, lane: 2 }, { time: 17000, lane: 2 },
          { time: 17200, lane: 0 }, { time: 17400, lane: 1 }, { time: 17600, lane: 2 },
          { time: 17800, lane: 0 }, { time: 18000, lane: 1 }, { time: 18200, lane: 2 },
          // Final
          { time: 18800, lane: 0 }, { time: 19000, lane: 2 }, { time: 19200, lane: 1 },
          { time: 19400, lane: 0 }, { time: 19600, lane: 1 }, { time: 19800, lane: 2 },
          { time: 20000, lane: 1 }, { time: 20200, lane: 0 }, { time: 20600, lane: 2 },
          { time: 21000, lane: 1 }, { time: 21400, lane: 0 }, { time: 21800, lane: 1 },
          { time: 22200, lane: 2 }, { time: 22600, lane: 0 }, { time: 23000, lane: 1 },
        ])
      },
    ]

    const rhythmStmt = db.prepare(`
      INSERT OR REPLACE INTO rhythm_songs (song_key, title, difficulty, bpm, notes_data)
      VALUES (?, ?, ?, ?, ?)
    `)
    for (const song of RHYTHM_SONGS) {
      rhythmStmt.run([song.song_key, song.title, song.difficulty, song.bpm, song.notes_data])
    }
    rhythmStmt.free()

    // Save to file
    const data = db.export()
    writeFileSync(dbPath, Buffer.from(data))

    console.log('Database initialized with', INITIAL_CHARACTERS.length, 'characters')
    return db
  })()

  return dbInitPromise
}

export function saveDb(): void {
  if (db) {
    const data = db.export()
    writeFileSync(dbPath, Buffer.from(data))
  }
}

export function getDb(): SqlJsDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.')
  }
  return db
}

// Wrapper object to mimic better-sqlite3 sync API
export const dbWrapper = {
  prepare(sql: string) {
    const database = getDb()
    const stmt = database.prepare(sql)
    return {
      run(...params: any[]) {
        stmt.bind(params)
        stmt.step()
        stmt.free()
        return { lastInsertRowid: database.exec("SELECT last_insert_rowid()")[0]?.values[0]?.[0] || 0 }
      },
      get(...params: any[]) {
        stmt.bind(params)
        let result: any = null
        if (stmt.step()) {
          result = {}
          const columns = stmt.getColumnNames()
          const values = stmt.get()
          columns.forEach((col, i) => { result[col] = values[i] })
        }
        stmt.free()
        return result
      },
      all(...params: any[]) {
        stmt.bind(params)
        const results: any[] = []
        const columns = stmt.getColumnNames()
        while (stmt.step()) {
          const values = stmt.get()
          const row: any = {}
          columns.forEach((col, i) => { row[col] = values[i] })
          results.push(row)
        }
        stmt.free()
        return results
      }
    }
  }
}

export default dbWrapper
