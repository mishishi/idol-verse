# 虚拟偶像收集养成游戏 — Phase 2 实现计划

> **目标：** 实现角色养成系统 + 应援殿基础功能

**前置依赖：** Phase 1 完成

---

## Task 1: 养成系统后端

**文件：** 修改 `server/db/sqlite.ts`, `server/routes/user.ts`

- [ ] **Step 1: 添加养成相关字段**
  ```sql
  -- user_characters 表已存在，新增字段
  ALTER TABLE user_characters ADD COLUMN level INTEGER DEFAULT 1;
  ALTER TABLE user_characters ADD COLUMN skill_level INTEGER DEFAULT 1;
  ALTER TABLE user_characters ADD COLUMN exp INTEGER DEFAULT 0;
  ```

- [ ] **Step 2: 创建经验值配置**
  ```typescript
  const EXP_CURVE = [0, 100, 250, 450, 700, 1000, 1350, ...] // 升级所需经验
  const FRAGMENT_TO_EXP = 10 // 每碎片转换为10经验
  ```

- [ ] **Step 3: 实现升级 API**
  `POST /api/user/characters/:id/level-up`
  - 消耗角色碎片提升等级
  - 满级上限 80 级

- [ ] **Step 4: 实现亲密度提升 API**
  `POST /api/user/characters/:id/intimacy-up`
  - 每日可提升一次（消耗道具或免费）
  - 亲密度 1-10 级解锁不同奖励

---

## Task 2: 应援殿后端

**文件：** 新建 `server/routes/support.ts`, 修改 `server/db/sqlite.ts`

- [ ] **Step 1: 创建应援殿表**
  ```sql
  CREATE TABLE user_support_spot (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    slot_index INTEGER NOT NULL, -- 0,1,2 三个槽位
    character_id TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  ```

- [ ] **Step 2: 实现应援殿 API**
  - `GET /api/support` - 获取应援殿状态
  - `PUT /api/support/slot/:index` - 放置/移除偶像
  - `POST /api/support/collect` - 收取应援产出

- [ ] **Step 3: 应援产出计算**
  - 每小时产出应援币
  - 产出 = Σ(角色基础产出 × 稀有度加成 × 亲密度加成)

---

## Task 3: 养成系统前端

**文件：** 修改 `src/renderer/App.tsx`, 新建 `src/renderer/pages/CharacterDetail.tsx`

- [ ] **Step 1: 创建角色详情页**
  - 显示角色满图鉴立绘（占位图）
  - 显示等级、经验条、碎片数量
  - 显示亲密度等级和进度
  - 升级按钮、互动按钮

- [ ] **Step 2: 实现经验条组件**
  - 显示当前/升级所需经验
  - 升级动画效果

- [ ] **Step 3: 实现亲密度展示**
  - 1-10 级阶段显示
  - 每级解锁内容提示

---

## Task 4: 应援殿前端

**文件：** 新建 `src/renderer/pages/SupportHall.tsx`

- [ ] **Step 1: 创建应援殿页面**
  - 3个角色槽位展示
  - 点击槽位弹出角色选择
  - 收取按钮

- [ ] **Step 2: 应援产出动画**
  - 放置角色后显示产出中状态
  - 收取时的动画效果

---

## Task 5: 整合测试

- [ ] **Step 1: 端到端测试**
  登录 → 查看角色详情 → 升级角色 → 设置应援殿 → 收取产出

- [ ] **Step 2: 提交 Phase 2 完成**
  `git commit -m "feat: implement character cultivation and support hall"`

---

## 成功指标（Phase 2）

- ✅ 角色可升级（消耗碎片）
- ✅ 角色亲密度可提升
- ✅ 应援殿可放置偶像
- ✅ 应援产出可收取
