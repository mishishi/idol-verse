# 偶像收藏集 - Neon Holographic UI 设计规范

## 1. 设计理念

**主题**: 宇宙星空 + 霓虹赛博朋克 + 偶像舞台

深紫黑背景搭配霓虹光效，全息渐变呈现稀有度，整体氛围如同置身于偶像的星空演唱会。

---

## 2. 色彩系统

### 基础色板
```
背景深色:     #0a0a1a (主背景)
背景渐变:     #0a0a1a → #1a0a2e (星云紫)
卡片背景:     rgba(255, 255, 255, 0.05) (玻璃态)
文字主色:     #ffffff
文字次要:     rgba(255, 255, 255, 0.6)
边框默认:     rgba(255, 255, 255, 0.1)
```

### 稀有度配色
```
N   (普通):   #a0a0a0 - 银色微光
R   (稀有):   #00ff88 - 翠绿霓虹
SR  (超稀有): #00ccff - 天蓝霓虹
SSR (超绝稀有): #ff00ff → #00ffff - 紫粉虹光渐变
UR  (终极稀有): #ffd700 → #ff6b00 - 金橙流光
```

### 功能色
```
主按钮:       #ff6b9d (樱花粉) → #c44569 渐变
危险/警告:    #ff4757
成功:         #2ed573
货币色-圣像石: #ffb8d0 (粉水晶)
货币色-召唤券: #b8d4ff (冰蓝)
```

---

## 3. 字体

```css
主字体: 'Orbitron', 'Rajdhani', sans-serif;  /* 科技感标题 */
正文字体: 'Noto Sans SC', 'PingFang SC', sans-serif;  /* 中文正文 */
霓虹效果: 添加 text-shadow 多层光晕
```

---

## 4. 组件规范

### 4.1 按钮

**主按钮 (抽卡按钮)**
```css
background: linear-gradient(135deg, #ff6b9d, #c44569);
border: 2px solid rgba(255, 107, 157, 0.5);
border-radius: 12px;
box-shadow: 0 0 20px rgba(255, 107, 157, 0.4),
            inset 0 0 20px rgba(255, 255, 255, 0.1);
/* Hover: 发光增强 */
box-shadow: 0 0 40px rgba(255, 107, 157, 0.6),
            inset 0 0 20px rgba(255, 255, 255, 0.2);
```

**次要按钮**
```css
background: rgba(255, 255, 255, 0.05);
border: 1px solid rgba(255, 255, 255, 0.2);
color: #fff;
/* Hover: 边框霓虹化 */
border-color: #00ccff;
box-shadow: 0 0 10px rgba(0, 204, 255, 0.3);
```

### 4.2 卡片

**玻璃态卡片**
```css
background: rgba(255, 255, 255, 0.03);
backdrop-filter: blur(10px);
border: 1px solid rgba(255, 255, 255, 0.1);
border-radius: 16px;
```

**角色卡片**
```css
/* 外框根据稀有度变色 */
border: 2px solid [稀有度对应颜色];
box-shadow: 0 0 15px [稀有度对应颜色，透明度0.3];
/* Hover: 边框呼吸动画 */
animation: glow-pulse 2s ease-in-out infinite;
```

### 4.3 输入框
```css
background: rgba(255, 255, 255, 0.05);
border: 1px solid rgba(255, 255, 255, 0.2);
border-radius: 8px;
color: #fff;
/* Focus: 霓虹聚焦框 */
border-color: #ff6b9d;
box-shadow: 0 0 15px rgba(255, 107, 157, 0.3);
```

### 4.4 弹窗/Modal
```css
background: rgba(10, 10, 26, 0.95);
backdrop-filter: blur(20px);
border: 1px solid rgba(255, 255, 255, 0.1);
border-radius: 20px;
/* 边缘彩虹光晕 */
box-shadow: 0 0 50px rgba(255, 0, 255, 0.2),
            0 0 100px rgba(0, 255, 255, 0.1);
```

---

## 5. 页面设计

### 5.1 登录/注册页

- 背景: 星空粒子动画 + 缓慢漂浮的光点
- 中央: 玻璃态卡片，内含 logo + 表单
- Logo: "偶像收藏集" 霓虹发光字
- 表单输入框带 focus 光效
- 按钮: 粉红渐变霓虹主按钮

### 5.2 首页

- 顶部: 用户信息 + 货币显示（圣像石/召唤券带图标）
- 主区域: 3个大卡片菜单（抽卡/图鉴/背包）
- 菜单卡片: 玻璃态 + hover 霓虹边框
- 背景: 动态星云粒子

### 5.3 抽卡页 (核心页面)

**布局:**
```
┌─────────────────────────────────┐
│  ← 返回        召唤抽卡          │
├─────────────────────────────────┤
│  [圣像石: 💎100]  [召唤券: 🎫10] │
├─────────────────────────────────┤
│                                 │
│         ╔═══════════╗           │
│         ║           ║           │
│         ║   抽卡    ║           │
│         ║   按钮    ║           │
│         ║           ║           │
│         ╚═══════════╝           │
│                                 │
│     [保底进度: ████░░░░ 78/90]   │
│                                 │
└─────────────────────────────────┘
```

**抽卡按钮特效:**
- 默认: 粉红渐变 + 柔和发光
- Hover: 发光增强 + 轻微放大
- Click: 快速闪烁 + 粒子爆发
- Disabled: 灰度化

**保底进度条:**
- 渐变填充 (绿→蓝→紫→金，随进度变化)
- 数字显示 "78/90"
- 90/180 节点有特殊标记

**抽卡结果展示:**
- 全屏遮罩 + 中央角色卡片
- 稀有度越高，动画越华丽 (N=淡入，SSR/UR=星光爆炸+光柱)
- 显示角色名、稀有度、立绘
- "确定" 按钮关闭

### 5.4 图鉴页

- 顶部: 稀有度筛选标签 (全部/N/R/SR/SSR/UR)
- 网格布局展示所有角色
- 未获得的角色: 半透明 + 问号占位
- 已获得的角色: 正常显示 + 获得标记

### 5.5 背包页

- 网格展示用户拥有的角色
- 显示: 角色立绘 + 名字 + 碎片数量 + 亲密度
- 碎片够了可合成 (TODO)
- 点击角色查看详情弹窗

---

## 6. 动画规范

### 6.1 全局动画
```css
/* 背景星尘漂浮 */
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}

/* 霓虹呼吸 */
@keyframes neon-breathe {
  0%, 100% { opacity: 0.8; }
  50% { opacity: 1; box-shadow: 0 0 30px currentColor; }
}

/* 边框流光 */
@keyframes border-flow {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
```

### 6.2 抽卡动画
```css
/* SSR/UR 爆星效果 */
@keyframes starburst {
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}

/* 闪光划过 */
@keyframes flash {
  0% { left: -100%; }
  100% { left: 200%; }
}
```

---

## 7. 实现优先级

### Phase 1 - 核心视觉 (建议先做)
1. 全局样式 + 字体引入
2. 色彩系统 + CSS 变量
3. 登录/注册页改版
4. 首页框架

### Phase 2 - 抽卡体验
5. 抽卡页 UI
6. 抽卡动画效果
7. 结果展示弹窗

### Phase 3 - 完善页面
8. 图鉴页
9. 背包页
10. 细节动画

---

## 8. 技术建议

### CSS 方案
```css
/* 使用 CSS 变量便于主题切换 */
:root {
  --bg-primary: #0a0a1a;
  --bg-gradient: linear-gradient(135deg, #0a0a1a, #1a0a2e);
  --rarity-n: #a0a0a0;
  --rarity-r: #00ff88;
  --rarity-sr: #00ccff;
  --rarity-ssr: linear-gradient(135deg, #ff00ff, #00ffff);
  --rarity-ur: linear-gradient(135deg, #ffd700, #ff6b00);
  --accent-pink: linear-gradient(135deg, #ff6b9d, #c44569);
}
```

### 背景实现
- 方案A: CSS 动画 + 伪元素 (简单，轻量)
- 方案B: Canvas 粒子 (更炫酷)
- 方案C: WebGL (最炫酷，适合高端设备)

### 图标
- 使用 Lucide React 或 Heroicons
- 或 emoji: 💎🎫⭐💫✨🌟
