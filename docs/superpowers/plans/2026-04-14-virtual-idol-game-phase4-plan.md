# 虚拟偶像收集养成游戏 — Phase 4 计划

> **目标：** 社交系统 + 好友互动
> **状态：** 进行中

---

## 功能列表

### 1. 好友系统
**文件：** `server/routes/friend.ts`, `src/renderer/App.tsx`

- [x] **后端 API**
  - `GET /api/friends` - 获取好友列表
  - `POST /api/friends/:userId` - 添加好友
  - `DELETE /api/friends/:userId` - 删除好友
  - `GET /api/friends/requests` - 获取好友申请列表
  - `POST /api/friends/requests` - 发送好友申请
  - `POST /api/friends/requests/:id/accept` - 接受好友申请
  - `DELETE /api/friends/requests/:id` - 拒绝好友申请

- [x] **前端 UI**
  - 好友列表页面
  - 好友申请页面
  - 添加好友（搜索用户名）

---

### 2. 体力互赠
**文件：** `server/routes/friend.ts`, `src/renderer/App.tsx`

- [x] **后端 API**
  - `POST /api/friends/send-stamina` - 赠送体力给好友
  - `GET /api/friends/stamina-status` - 领取收到的体力
  - `POST /api/friends/receive-stamina` - 领取所有收到的体力
  - 每日可赠送 3 次
  - 每次赠送 10 体力

- [x] **前端 UI**
  - 好友列表中显示可赠送/已领取状态
  - 体力领取通知 banner
  - 体力领取弹窗

---

### 3. 应援留言板
**文件：** `server/routes/support.ts`, `src/renderer/App.tsx`

- [x] **后端 API**
  - `GET /api/support/board/:characterId` - 获取角色留言板
  - `POST /api/support/board/:characterId` - 发送留言
  - `DELETE /api/support/board/:characterId/:messageId` - 删除留言
  - 留言字数限制 50 字，每日每角色1条

- [x] **前端 UI**
  - 角色详情页显示留言板入口（MessageBoard 组件）
  - 留言列表展示
  - 输入留言（50字内）
  - 删除自己的留言

---

## 开发顺序

1. **好友系统** - 基础社交
2. **体力互赠** - 互动激励
3. **应援留言板** - 角色绑定

---

## 数据库变更

```sql
-- 好友关系表
CREATE TABLE friends (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  friend_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, friend_id)
);

-- 好友申请表
CREATE TABLE friend_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_user_id INTEGER NOT NULL,
  to_user_id INTEGER NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, accepted, rejected
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 体力赠送记录表
CREATE TABLE stamina_gifts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id INTEGER NOT NULL,
  receiver_id INTEGER NOT NULL,
  amount INTEGER DEFAULT 10,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  received_at DATETIME
);
```
