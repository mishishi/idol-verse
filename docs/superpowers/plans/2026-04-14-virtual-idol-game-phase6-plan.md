# 虚拟偶像收集养成游戏 — Phase 6 计划

> **目标：** 应援排行榜 + 月卡通行证
> **状态：** 待开发

---

## 功能列表

### 1. 应援排行榜
**文件：** `server/routes/ranking.ts`, `src/renderer/App.tsx`

- [ ] **后端 API**
  - `GET /api/ranking/idol-weekly` - 本周偶像应援榜（按累计应援值排序）
  - `POST /api/ranking/support/:characterId` - 为偶像应援（消耗圣像石）
  - `GET /api/ranking/my-support/:characterId` - 查询自己本周对某偶像的应援额
  - 每周日 24:00 重置排行榜
  - 应援汇率：1 圣像石 = 1 应援值

- [ ] **前端 UI**
  - 排行榜页面 Tab：周榜 / 我的应援
  - 偶像应援榜（显示角色名、稀有度、总应援值、前3名高亮）
  - 应援按钮（输入圣像石数量进行应援）
  - 我的应援记录
  - Top 3 玩家显示皇冠/奖牌特效

---

### 2. 月卡（成长通行证）
**文件：** `server/routes/pass.ts`, `src/renderer/App.tsx`

- [ ] **后端 API**
  - `GET /api/pass/status` - 获取月卡状态（是否激活、剩余天数）
  - `POST /api/pass/claim-daily` - 领取今日月卡奖励
  - `GET /api/pass/missions` - 获取本期任务列表
  - `POST /api/pass/missions/:id/claim` - 领取任务奖励
  - 月卡有效期 30 天，月卡期间每日可领 100 圣像石 + 20 体力
  - 任务分免费档（基础奖励）和月卡档（双倍奖励 + 专属任务）

- [ ] **前端 UI**
  - 通行证页面（类似游戏内季票界面）
  - 30 天日历进度条
  - 免费档 / 月卡档 切换
  - 每日任务列表（抽卡、登录、赠送体力等）
  - 领取按钮 + 已领取状态
  - 月卡激活按钮（未激活时）

---

## 数据库变更

### 应援排行榜

```sql
-- 偶像应援记录（周榜）
CREATE TABLE idol_weekly_support (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  character_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,  -- 本周累计应援值
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(character_id, user_id)
);

-- 周榜重置时将记录归档
CREATE TABLE idol_support_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  character_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 应援行为记录（用于周榜计算）
CREATE TABLE support_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  character_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 月卡

```sql
-- 用户月卡订阅
CREATE TABLE user_pass (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  pass_type TEXT DEFAULT 'monthly',  -- 'monthly', 'season'
  activated_at DATETIME NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 月卡每日领取记录
CREATE TABLE pass_daily_claims (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  claim_date DATE NOT NULL,
  pass_type TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, claim_date, pass_type)
);

-- 通行证任务
CREATE TABLE pass_missions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mission_key TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  target INTEGER DEFAULT 1,
  target_type TEXT NOT NULL,  -- 'gacha', 'login', 'send_stamina', 'interact', 'support'
  reward_type TEXT NOT NULL,
  reward_amount INTEGER NOT NULL,
  bonus_reward_type TEXT,      -- 月卡额外奖励
  bonus_reward_amount INTEGER,
  pass_type TEXT DEFAULT 'monthly',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 用户通行证任务进度
CREATE TABLE user_pass_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  mission_id INTEGER NOT NULL,
  progress INTEGER DEFAULT 0,
  claimed BOOLEAN DEFAULT FALSE,
  pass_type TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, mission_id, pass_type)
);
```

---

## 开发顺序

1. **应援排行榜后端** - 榜单 API + 应援 API
2. **应援排行榜前端** - 榜单展示 + 应援交互
3. **月卡后端** - 订阅状态 + 每日领取 + 任务系统
4. **月卡前端** - 通行证页面 + 任务列表

---

## 应援排行榜配置

| 排行 | 奖励 |
|------|------|
| 第 1 名 | 称号 + 500 圣像石 |
| 第 2 名 | 称号 + 300 圣像石 |
| 第 3 名 | 称号 + 100 圣像石 |
| 第 4-10 名 | 50 圣像石 |

---

## 月卡奖励配置

| 档位 | 每日奖励 | 30天累计 |
|------|---------|---------|
| 免费档 | 圣像石 ×30 | 圣像石 ×900 |
| 月卡档 | 圣像石 ×100 + 体力 ×20 | 圣像石 ×3000 + 体力 ×600 + 限定称号 |

---

## 成功指标

- [ ] 可查看偶像应援周榜
- [ ] 可对偶像进行应援
- [ ] 可购买并激活月卡
- [ ] 月卡期间每日可领取奖励
- [ ] 通行证任务可领取奖励
