# 虚拟偶像收集养成游戏 — Phase 3~6 功能实现记录

> **更新日期：** 2026/04/15
> **状态：** 功能开发完成，持续迭代中

---

## 一、阶段完成情况总览

| 阶段 | 名称 | 状态 |
|------|------|------|
| Phase 2 | 角色养成 + 应援系统 | ✅ 已完成 |
| Phase 3 | 抽卡体验 + 音效 + 角色互动 | ✅ 已完成 |
| Phase 4 | 社交系统 + 好友互动 | ✅ 已完成 |
| Phase 5 | 每日任务 + 成就系统 | ✅ 已完成 |
| Phase 6 | 应援排行榜 + 月卡通行证 | ✅ 已完成 |

---

## 二、Phase 2 — 角色养成 + 应援系统（已完成）

### 2.1 角色好感度系统
- **文件：** `server/routes/cultivation.ts`, `src/renderer/App.tsx`
- **功能：**
  - 角色详情页「互动」按钮，每日可提升好感度
  - 好感度等级解锁奖励（圣像石、召唤券、碎片）
  - 互动动画特效（爱心/星星粒子效果）
  - 好感度数据持久化到数据库

### 2.2 应援留言板
- **文件：** `server/routes/support.ts`, `src/renderer/App.tsx`
- **功能：**
  - 每个角色独立的留言板
  - 每位玩家每日每角色可留言 1 条（50 字以内）
  - 可删除自己的留言
  - 留言板入口在角色详情页底部

### 2.3 好友系统
- **文件：** `server/routes/friend.ts`
- **API：**
  - `GET /api/friends` — 获取好友列表
  - `POST /api/friends/:userId` — 添加好友
  - `DELETE /api/friends/:userId` — 删除好友
  - `GET /api/friends/requests` — 获取好友申请列表
  - `POST /api/friends/requests` — 发送好友申请
  - `POST /api/friends/requests/:id/accept` — 接受申请
  - `DELETE /api/friends/requests/:id` — 拒绝申请

### 2.4 体力互赠
- **文件：** `server/routes/friend.ts`, `src/renderer/App.tsx`
- **规则：**
  - 每日可赠送体力 3 次
  - 每次赠送 10 体力
  - 好友可领取收到的体力

---

## 三、Phase 3 — 完善抽卡体验 + 养成系统 + 互动功能（已完成）

### 3.1 十连抽卡
- **文件：** `server/routes/gacha.ts`, `src/renderer/App.tsx`
- **规则：**
  - 消耗 100 圣像石（10 × 10）
  - 享受保底逻辑
  - 专属十连动画（逐张展示）
  - 返回 10 个角色结果数组

### 3.2 碎片合成系统
- **文件：** `server/routes/user.ts`, `src/renderer/App.tsx`
- **规则：**
  - N 稀有度：消耗 30 碎片合成
  - R 稀有度：消耗 20 碎片合成
  - SR 稀有度：消耗 10 碎片合成
  - SSR/UR 不可合成
  - 已有角色则增加碎片

### 3.3 移动端适配
- **文件：** `src/renderer/styles/neon.css`
- **功能：**
  - 响应式断点（768px, 480px）
  - 底部导航栏（手机端 BottomNav）
  - 抽卡页面触摸优化
  - Modal 全屏适配

### 3.4 音效系统
- **文件：** `src/renderer/hooks/useAudio.ts`
- **音效类型：**
  - 抽卡音效（单抽 + 十连）
  - SSR/UR 专属爆音
  - 背景音乐（BGM，可开关）
  - UI 交互音效（点击、弹窗）
  - 好感度提升音效
  - 合成成功音效
  - 升级音效
- **BGM 风格：** 日系偶像梦幻风，贝斯 + 旋律音型 + 朦胧音色

### 3.5 角色亲密度（Phase 2 补充）
- **文件：** `server/routes/cultivation.ts`, `src/renderer/App.tsx`
- **功能：**
  - 角色详情页「互动」按钮
  - 每日好感度上限 +1/天
  - 好感度等级解锁奖励提示
  - 升级后重新获取数据

### 3.6 音游系统（核心演出玩法）
- **文件：** `server/routes/rhythm.ts`, `src/renderer/components/RhythmPage.tsx`, `src/renderer/hooks/useRhythmGame.ts`
- **后端 API：**
  - `GET /api/rhythm/songs` — 获取歌曲列表
  - `POST /api/rhythm/play/:songId` — 开始演奏（扣 20 体力）
  - `POST /api/rhythm/score/:songId` — 提交成绩，结算奖励
  - `GET /api/rhythm/best/:songId` — 获取最佳成绩
  - `GET /api/rhythm/leaderboard` — 全球排行榜
- **奖励规则：**
  - S 级：圣像石 ×30 + 召唤券 ×1
  - A 级：圣像石 ×20
  - B 级：圣像石 ×10
  - C 级：圣像石 ×5
  - D 级：无奖励
- **歌曲配置（预置 3 首）：**
  - 「星光旋律」— BPM 120，难度 ★★☆
  - 「心跳节拍」— BPM 140，难度 ★★★
  - 「狂热舞台」— BPM 160，难度 ★★★★
- **数据库表：** `rhythm_songs`, `rhythm_scores`, `rhythm_user_stats`

---

## 四、Phase 4 — 每日任务 + 成就系统（已完成）

### 4.1 每日任务
- **文件：** `server/routes/daily.ts`, `src/renderer/App.tsx`
- **后端 API：**
  - `GET /api/daily/tasks` — 获取今日任务状态
  - `POST /api/daily/tasks/:id/claim` — 领取任务奖励
  - 每日凌晨自动重置任务进度
- **任务配置：**

| 任务 Key | 标题 | 目标 | 奖励 |
|---------|------|------|------|
| login | 每日登录 | 1 次 | 圣像石 ×20 |
| gacha_single | 单抽达人 | 单抽 1 次 | 召唤券 ×1 |
| gacha_multi | 十连召唤 | 十连 1 次 | 圣像石 ×50 |
| send_stamina | 友情馈赠 | 赠送体力 | 圣像石 ×15 |
| interact | 偶像互动 | 互动 1 次 | 碎片 ×3 |

### 4.2 成就系统
- **文件：** `server/routes/achievement.ts`, `src/renderer/App.tsx`
- **后端 API：**
  - `GET /api/achievements` — 获取所有成就
  - `POST /api/achievements/:id/claim` — 领取成就奖励
  - 条件自动检测（抽卡次数、角色数、登录天数等）
  - 一次性奖励
- **成就配置：**

| 成就 Key | 标题 | 条件 | 奖励 |
|---------|------|------|------|
| first_gacha | 初出茅庐 | 首次抽卡 | 圣像石 ×50 |
| gacha_10 | 召唤新手 | 累计抽卡 10 次 | 召唤券 ×3 |
| gacha_100 | 召唤达人 | 累计抽卡 100 次 | SR 角色券 ×1 |
| collect_5 | 偶像收集 | 拥有 5 个角色 | 圣像石 ×100 |
| collect_10 | 偶像收藏家 | 拥有 10 个角色 | UR 角色券 ×1 |
| login_7 | 连续登录 | 连续登录 7 天 | 召唤券 ×5 |
| login_30 | 忠实粉丝 | 连续登录 30 天 | 限定角色 ×1 |
| friend_10 | 社交达人 | 拥有 10 个好友 | 圣像石 ×200 |

### 4.3 签到日历 UI
- **文件：** `src/renderer/App.tsx`（CalendarPage 组件）, `src/renderer/styles/neon.css`
- **功能：**
  - 月份切换导航（上一月/下一月）
  - 显示当月登录日期（绿色勾选标记）
  - 当日高亮显示
  - 当前连续登录天数
  - 累计登录天数
  - 入口：顶部导航菜单「签到日历」

---

## 五、Phase 5 — 应援排行榜 + 月卡通行证（已完成）

### 5.1 应援排行榜
- **文件：** `server/routes/ranking.ts`, `src/renderer/App.tsx`（RankingPage 组件）
- **后端 API：**
  - `GET /api/ranking/idol-weekly` — 本周偶像应援榜
  - `POST /api/ranking/support/:characterId` — 为偶像应援
  - `GET /api/ranking/my-supports` — 我的应援记录
  - `GET /api/ranking/friends` — 好友排行榜
  - 每周日 24:00 重置排行榜
  - 应援汇率：1 圣像石 = 1 应援值
- **前端 UI：**
  - Tab 切换：周榜 / 我的应援 / 好友排行
  - Top 3 高亮显示皇冠/奖牌特效
  - 应援弹窗（输入圣像石数量）

### 5.2 月卡通行证
- **文件：** `server/routes/pass.ts`, `src/renderer/App.tsx`（PassPage 组件）
- **后端 API：**
  - `GET /api/pass/status` — 获取月卡状态
  - `POST /api/pass/purchase` — 购买月卡（300 圣像石）
  - `POST /api/pass/claim-daily` — 领取今日奖励
  - `GET /api/pass/missions` — 获取任务列表
  - `POST /api/pass/missions/:id/claim` — 领取任务奖励
- **月卡规则：**
  - 有效期 30 天
  - 每日可领取：圣像石 ×100 + 体力 ×20
  - 30 天累计：圣像石 ×3000 + 体力 ×600
  - 任务分免费档和月卡档（月卡双倍奖励）

---

## 六、Phase 6 — 体力商店（已完成）

### 6.1 体力购买系统
- **文件：** `server/routes/user.ts`, `src/renderer/App.tsx`（StaminaShopPage 组件）
- **后端 API：**
  - `POST /api/user/buy-stamina` — 购买体力
- **购买规则：**

| 体力包 | 体力 | 圣像石成本 | 说明 |
|--------|------|-----------|------|
| 小体力包 | 50 | 50 | 标准汇率 |
| 中体力包 | 100 | 100 | 标准汇率 |
| 大体力包 | 200 | 180 | 9 折优惠 |

- **限制：**
  - 体力上限可溢出到 2 倍 max_stamina
  - 超出上限时不可购买
- **入口：** 顶部导航菜单「体力商店」

---

## 七、数据表结构汇总

### 核心用户表
- `users` — 用户账号信息
- `user_currency` — 圣像石、召唤券、体力
- `user_characters` — 用户拥有角色及碎片

### 抽卡相关
- `gacha_pools` — 奖池配置（常驻/限定）
- `characters` — 角色基础数据
- `user_gacha_records` — 抽卡记录

### 社交系统
- `friends` — 好友关系
- `friend_requests` — 好友申请
- `stamina_gifts` — 体力赠送记录
- `support_board` — 应援留言板

### 养成系统
- `character_intimacy` — 角色好感度
- `user_intimacy_logs` — 好感度日志

### 音游系统
- `rhythm_songs` — 歌曲配置（BPM、难度、note 数据）
- `rhythm_scores` — 分数记录
- `rhythm_user_stats` — 用户最佳成绩

### 任务成就
- `daily_tasks` — 每日任务配置
- `user_daily_progress` — 用户任务进度
- `achievements` — 成就配置
- `user_achievements` — 用户成就进度

### 通行证
- `user_pass` — 月卡订阅
- `pass_daily_claims` — 每日领取记录
- `pass_missions` — 通行证任务
- `user_pass_progress` — 通行证任务进度

### 排行榜
- `idol_weekly_support` — 本周应援数据
- `idol_support_history` — 应援历史归档

---

## 八、API 端点总览

| 模块 | 端点 | 方法 | 功能 |
|------|------|------|------|
| 认证 | `/api/auth/register` | POST | 注册 |
| 认证 | `/api/auth/login` | POST | 登录 |
| 认证 | `/api/auth/login-records` | GET | 登录记录 |
| 抽卡 | `/api/gacha/pull` | POST | 单抽 |
| 抽卡 | `/api/gacha/multi` | POST | 十连 |
| 用户 | `/api/user/currency` | GET | 获取货币 |
| 用户 | `/api/user/profile` | GET | 获取用户信息 |
| 用户 | `/api/user/characters` | GET | 获取角色列表 |
| 用户 | `/api/user/characters/:id/synthesis` | POST | 碎片合成 |
| 用户 | `/api/user/buy-stamina` | POST | 购买体力 |
| 好友 | `/api/friends` | GET | 好友列表 |
| 好友 | `/api/friends/:userId` | POST/DELETE | 添加/删除好友 |
| 好友 | `/api/friends/requests` | GET/POST | 好友申请 |
| 好友 | `/api/friends/send-stamina` | POST | 赠送体力 |
| 好友 | `/api/friends/receive-stamina` | POST | 领取体力 |
| 养成 | `/api/cultivation/interact/:characterId` | POST | 角色互动 |
| 养成 | `/api/cultivation/intimacy` | GET | 好感度信息 |
| 留言 | `/api/support/board/:characterId` | GET/POST/DELETE | 留言板 |
| 日历 | `/api/auth/login-records` | GET | 签到记录 |
| 音游 | `/api/rhythm/songs` | GET | 歌曲列表 |
| 音游 | `/api/rhythm/play/:songId` | POST | 开始演奏 |
| 音游 | `/api/rhythm/score/:songId` | POST | 提交成绩 |
| 音游 | `/api/rhythm/best/:songId` | GET | 最佳成绩 |
| 音游 | `/api/rhythm/leaderboard` | GET | 排行榜 |
| 任务 | `/api/daily/tasks` | GET | 每日任务 |
| 任务 | `/api/daily/tasks/:id/claim` | POST | 领取任务奖励 |
| 成就 | `/api/achievements` | GET | 成就列表 |
| 成就 | `/api/achievements/:id/claim` | POST | 领取成就奖励 |
| 排行 | `/api/ranking/idol-weekly` | GET | 偶像应援榜 |
| 排行 | `/api/ranking/support/:characterId` | POST | 应援偶像 |
| 排行 | `/api/ranking/friends` | GET | 好友排行 |
| 月卡 | `/api/pass/status` | GET | 月卡状态 |
| 月卡 | `/api/pass/purchase` | POST | 购买月卡 |
| 月卡 | `/api/pass/claim-daily` | POST | 领取每日奖励 |
| 月卡 | `/api/pass/missions` | GET | 通行证任务 |
| 月卡 | `/api/pass/missions/:id/claim` | POST | 领取任务奖励 |

---

## 九、页面入口一览

| 页面 | 路由 Key | 入口位置 |
|------|----------|---------|
| 首页 | home | 默认首页 |
| 抽卡 | gacha | 底部导航 |
| 图鉴 | gallery | 底部导航 |
| 背包 | inventory | 底部导航 |
| 应援厅 | support | 底部导航 |
| 好友 | friends | 底部导航 |
| 每日 | daily | 底部导航 |
| 排行 | ranking | 底部导航 |
| 通行证 | pass | 顶部菜单 |
| 演出(音游) | rhythm | 底部导航 |
| 签到日历 | calendar | 顶部菜单 |
| 体力商店 | stamina | 顶部菜单 |
| 角色详情 | detail | 图鉴/背包点击角色 |
