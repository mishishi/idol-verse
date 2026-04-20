# 虚拟偶像收集养成游戏 — Phase 1 实现计划

> **目标：** 搭建项目基础结构，实现用户注册登录 + 抽卡核心循环

**架构：** Electron + React + TypeScript（前端），Node.js/Express + SQLite（后端）

**技术栈：** electron-vite, React, TypeScript, better-sqlite3, JWT

---

## 文件结构

```
idol-game/
├── src/
│   ├── main/                 # Electron 主进程
│   │   └── main.ts
│   ├── preload/
│   │   └── preload.ts
│   └── renderer/             # React 渲染进程
│       ├── App.tsx
│       ├── pages/
│       │   ├── Login.tsx
│       │   ├── Home.tsx
│       │   └── Gacha.tsx
│       ├── components/
│       │   ├── CharacterCard.tsx
│       │   └── GachaResultModal.tsx
│       ├── hooks/
│       │   └── useAuth.ts
│       └── stores/
│           └── userStore.ts
├── server/                   # Node.js 后端
│   ├── index.ts
│   ├── routes/
│   │   ├── auth.ts
│   │   └── gacha.ts
│   └── db/
│       └── sqlite.ts
├── resources/
│   └── characters/          # 角色立绘
└── package.json
```

---

## Task 1: 项目初始化

**文件：**
- 创建：`package.json`
- 创建：`electron.vite.config.ts`
- 创建：`src/main/main.ts`
- 创建：`src/preload/preload.ts`
- 创建：`server/db/sqlite.ts`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "idol-game",
  "version": "1.0.0",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview"
  },
  "dependencies": {
    "electron": "^28.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "better-sqlite3": "^9.2.0",
    "jsonwebtoken": "^9.0.0",
    "bcryptjs": "^2.4.3"
  },
  "devDependencies": {
    "electron-vite": "^2.0.0",
    "@electron-toolkit/preload": "^3.0.0",
    "typescript": "^5.3.0"
  }
}
```

- [ ] **Step 2: 安装依赖**  
  Run: `npm install`

- [ ] **Step 3: 配置 electron-vite**  
  创建 `electron.vite.config.ts`

- [ ] **Step 4: 初始化 SQLite 数据库**  
  创建 `server/db/sqlite.ts`

- [ ] **Step 5: 启动验证**  
  Run: `npm run dev`  
  预期：Electron 窗口正常打开

- [ ] **Step 6: 提交**  
  Run: `git add . && git commit -m "feat: initialize Electron + React + SQLite project"`

---

## Task 2: 用户注册登录

**文件：**
- 创建：`server/routes/auth.ts`
- 创建：`server/index.ts`
- 创建：`src/renderer/pages/Login.tsx`
- 创建：`src/renderer/hooks/useAuth.ts`
- 修改：`src/renderer/App.tsx`

- [ ] **Step 1: 创建数据库表（已在 Task 1 完成）**

- [ ] **Step 2: 实现后端注册/登录 API**  
  创建 `server/routes/auth.ts`  
  端点：`POST /api/auth/register`，`POST /api/auth/login`

- [ ] **Step 3: 实现前端登录页面**  
  创建 `src/renderer/pages/Login.tsx`

- [ ] **Step 4: 实现 JWT Token 存储**  
  创建 `src/renderer/hooks/useAuth.ts`

- [ ] **Step 5: 验证**  
  Run: `npm run dev` → 注册用户 → 登录 → 成功进入主页

- [ ] **Step 6: 提交**  
  Run: `git add . && git commit -m "feat: add user registration and login"`

---

## Task 3: 角色数据结构

**文件：**
- 创建：`src/shared/types.ts`
- 创建：`server/routes/characters.ts`
- 创建：`src/renderer/pages/CharacterGallery.tsx`
- 创建：`src/renderer/components/CharacterCard.tsx`

- [ ] **Step 1: 创建共享类型**  
  创建 `src/shared/types.ts`

```typescript
export type Rarity = 'N' | 'R' | 'SR' | 'SSR' | 'UR';

export interface Character {
  id: string;
  name: string;
  rarity: Rarity;
  imagePath: string;
  description: string;
  voiceLines: string[];
}

export interface UserCharacter {
  id: number;
  characterId: string;
  fragmentCount: number;
  intimacyLevel: number;
  obtainedAt: Date;
}
```

- [ ] **Step 2: 创建 5 个基础角色数据**  
  在 `resources/characters/` 下创建 `characters.json`

- [ ] **Step 3: 实现角色图鉴 API**  
  创建 `server/routes/characters.ts`

- [ ] **Step 4: 实现角色卡片组件**  
  创建 `src/renderer/components/CharacterCard.tsx`

- [ ] **Step 5: 实现角色图鉴页面**  
  创建 `src/renderer/pages/CharacterGallery.tsx`

- [ ] **Step 6: 验证**  
  Run: `npm run dev` → 登录 → 查看图鉴页面

- [ ] **Step 7: 提交**  
  Run: `git add . && git commit -m "feat: add character data structure and gallery"`

---

## Task 4: 抽卡系统

**文件：**
- 创建：`server/routes/gacha.ts`
- 创建：`src/renderer/pages/Gacha.tsx`
- 创建：`src/renderer/components/GachaResultModal.tsx`

- [ ] **Step 1: 实现后端抽卡 API（含保底逻辑）**  
  创建 `server/routes/gacha.ts`

```typescript
// 保底逻辑：
// - 每10抽保底R以上
// - 第90抽小保底（50%概率提升）
// - 第180抽大保底（指定UP角色）
```

- [ ] **Step 2: 实现前端抽卡界面（10连抽动画）**  
  创建 `src/renderer/pages/Gacha.tsx`

- [ ] **Step 3: 实现抽卡结果弹窗**  
  创建 `src/renderer/components/GachaResultModal.tsx`

- [ ] **Step 4: 编写测试用例（验证保底机制）**  
  测试抽卡保底逻辑是否正确

- [ ] **Step 5: 验证**  
  Run: `npm run dev` → 登录 → 进入抽卡页面 → 进行10连抽 → 查看结果

- [ ] **Step 6: 提交**  
  Run: `git add . && git commit -m "feat: implement gacha system with pity mechanism"`

---

## Task 5: 角色背包与展示

**文件：**
- 创建：`src/renderer/pages/Inventory.tsx`
- 创建：`src/renderer/pages/CharacterDetail.tsx`

- [ ] **Step 1: 实现角色背包页面**  
  创建 `src/renderer/pages/Inventory.tsx`

- [ ] **Step 2: 实现角色详情查看（立绘、语音、亲密度）**  
  创建 `src/renderer/pages/CharacterDetail.tsx`

- [ ] **Step 3: 实现角色碎片合成**  
  在 `server/routes/characters.ts` 添加合成 API

- [ ] **Step 4: 验证**  
  Run: `npm run dev` → 登录 → 查看背包 → 点击角色查看详情

- [ ] **Step 5: 提交**  
  Run: `git add . && git commit -m "feat: add character inventory and detail view"`

---

## Task 6: 整合测试

- [ ] **Step 1: 端到端测试**  
  注册 → 登录 → 抽卡 → 查看角色 → 背包查看

- [ ] **Step 2: 提交 Phase 1 完成**  
  Run: `git add . && git commit -m "feat: complete Phase 1 - core framework with gacha system"`

---

## 资源获取建议

| 资源 | 来源 | 成本 |
|------|------|------|
| 角色立绘 | 外包约稿 / Pixiv购买 / AI辅助 | 中高 |
| Live2D动画 | 外包 / Live2D Cubism官方试用 | 中 |
| 语音 | TTS（初期）/ 外包录制（后期） | 低/高 |
| 背景音乐 | Freesound / 购买版权 | 低 |

---

## 成功指标（Phase 1）

- ✅ 用户可注册登录
- ✅ 可查看角色图鉴
- ✅ 可进行抽卡（含保底）
- ✅ 可查看和管理背包角色
