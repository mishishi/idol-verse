# 虚拟偶像收集养成游戏 — Phase 5 计划

> **目标：** 每日任务/成就系统
> **状态：** ✅ 已完成

---

## 功能列表

### 1. 每日任务
**文件：** `server/routes/daily.ts`, `src/renderer/App.tsx`

- [ ] **后端 API**
  - `GET /api/daily/tasks` - 获取今日任务状态
  - `POST /api/daily/tasks/:id/claim` - 领取任务奖励
  - 每日凌晨重置任务进度
  - 任务类型：登录奖励、抽卡次数、赠送体力、角色互动

- [ ] **前端 UI**
  - 每日任务面板（弹窗或页面 Tab）
  - 任务列表展示（图标、名称、进度、奖励）
  - 进度条动画
  - 领取按钮 + 已领取状态

---

### 2. 成就系统
**文件：** `server/routes/achievement.ts`, `src/renderer/App.tsx`

- [ ] **后端 API**
  - `GET /api/achievements` - 获取所有成就（已解锁/未解锁）
  - `POST /api/achievements/:id/claim` - 领取成就奖励
  - 条件自动检测（首次抽卡、收集角色数、累计充值等）
  - 一次性奖励

- [ ] **前端 UI**
  - 成就页面（弹窗或页面 Tab）
  - 成就卡片展示（图标、名称、描述、进度）
  - 已解锁/未解锁样式区分
  - 领取奖励按钮 + 已领取状态

---

## 数据库变更

```sql
-- 每日任务表
CREATE TABLE daily_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_key TEXT UNIQUE NOT NULL,  -- 'login', 'gacha_1', 'gacha_10', 'send_stamina', 'interact'
  title TEXT NOT NULL,
  description TEXT,
  target INTEGER DEFAULT 1,        -- 目标次数
  reward_type TEXT NOT NULL,       -- 'holy_stone', 'summon_ticket', 'fragment'
  reward_amount INTEGER NOT NULL,
  reset_daily BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 用户每日任务进度
CREATE TABLE user_daily_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  task_id INTEGER NOT NULL,
  progress INTEGER DEFAULT 0,
  claimed BOOLEAN DEFAULT FALSE,
  date DATE NOT NULL,              -- 任务日期（用于重置）
  claimed_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES daily_tasks(id) ON DELETE CASCADE,
  UNIQUE(user_id, task_id, date)
);

-- 成就表
CREATE TABLE achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  achievement_key TEXT UNIQUE NOT NULL,  -- 'first_gacha', 'collect_5', 'collect_all'
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,                        -- 图标标识
  condition_type TEXT NOT NULL,    -- 'gacha_count', 'character_count', 'login_days', 'stamina_sent'
  condition_value INTEGER NOT NULL, -- 目标值
  reward_type TEXT NOT NULL,
  reward_amount INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 用户成就进度
CREATE TABLE user_achievements (
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
);
```

---

## 开发顺序

1. **数据库表设计** - 创建任务和成就相关表
2. **后端 API** - 每日任务 + 成就系统
3. **前端 UI** - 任务/成就面板
4. **任务触发检测** - 在抽卡、体力赠送等操作时更新任务进度

---

## 每日任务配置

| 任务 Key | 标题 | 描述 | 目标 | 奖励 |
|---------|------|------|------|------|
| login | 每日登录 | 登录游戏 | 1 | 圣像石 ×20 |
| gacha_single | 单抽达人 | 单抽 1 次 | 1 | 召唤券 ×1 |
| gacha_multi | 十连召唤 | 十连抽卡 1 次 | 1 | 圣像石 ×50 |
| send_stamina | 友情馈赠 | 赠送体力给好友 | 1 | 圣像石 ×15 |
| interact | 偶像互动 | 与角色互动 | 1 | 碎片 ×3 |

---

## 成就配置

| 成就 Key | 标题 | 描述 | 条件 | 奖励 |
|---------|------|------|------|------|
| first_gacha | 初出茅庐 | 首次抽卡 | 抽 1 次 | 圣像石 ×50 |
| gacha_10 | 召唤新手 | 累计抽卡 10 次 | 10 次 | 召唤券 ×3 |
| gacha_100 | 召唤达人 | 累计抽卡 100 次 | 100 次 | SSR 角色券 ×1 |
| collect_5 | 偶像收集 | 拥有 5 个不同角色 | 5 个 | 圣像石 ×100 |
| collect_10 | 偶像收藏家 | 拥有 10 个不同角色 | 10 个 | UR 角色券 ×1 |
| login_7 | 连续登录 | 连续登录 7 天 | 7 天 | 召唤券 ×5 |
| login_30 | 忠实粉丝 | 连续登录 30 天 | 30 天 | 限定角色 ×1 |
| friend_10 | 社交达人 | 拥有 10 个好友 | 10 人 | 圣像石 ×200 |
