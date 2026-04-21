# UI/UX 精细化重构设计规范

**日期**: 2026-04-21
**目标**: 降低视觉疲劳，提升可用性，建立可维护的交互基础
**整体方向**: 视觉冲击力稍降，换来可长时间使用的舒适度

---

## 1. 动效精简（Animation Reduction）

### 原则
保留 1 个全局呼吸感动效，移除所有高频率/高对比度的微动效。

### 移除项
| 位置 | 移除内容 |
|---|---|
| `App.tsx` | `.star-particles` 全局星点（30→0，完全移除） |
| `App.tsx` | `.shooting-star` 流星 |
| `App.tsx` | `.floating-particles` 浮游粒子 |
| `home.css` | `.action-card-new:hover` 的 `translateY(-3px)` |
| `home.css` | `.scroll-card:hover` 的 `translateY(-4px)` |
| `common.css` | `.glow-pulse` 呼吸光晕 |
| `common.css` | `.float-animation` 浮动动画 |
| `neon.css` | `.neon-breathe` |
| `gacha.css` | `.gacha-spin` 抽卡旋转 |

### 保留项
- `nebulaDrift` — 背景星云渐变（20s 一次周期，低对比度，保留）
- `gachaReveal` — 抽卡结果展示动效（用户体验关键节点，保留）
- `fadeSlideIn` — 页面进入动画（保留）
- `starTwinkle` — 仅在 **Gallery 页面**的 `starfield` 保留（那里是专门展示页，不是全局）

### Hover 交互变更
```css
/* Before */
.card:hover { transform: translateY(-4px); box-shadow: ... }
.card:active { transform: translateY(1px) scale(0.97); }

/* After */
.card:hover { border-color: var(--accent-pink-solid); box-shadow: 0 0 12px rgba(255,107,157,0.2); }
.card:active { transform: scale(0.97); }
```

---

## 2. 键盘导航 + ARIA（Accessibility）

### 焦点管理
所有可点击的非 `<button>` 元素添加键盘支持：

```tsx
// 模板
<div
  className="action-card-new"
  tabIndex={0}
  role="button"
  onClick={...}
  onKeyDown={(e) => e.key === 'Enter' && ...}
  aria-label="召唤抽卡"
>
```

### 需要添加键盘支持的元素
| 组件 | 文件 | 说明 |
|---|---|---|
| `.action-card-new` | App.tsx HomePage | 4个快捷入口卡片 |
| `.scroll-card` | App.tsx HomePage | 滚动区活动卡片 |
| `.quickbar-item` | App.tsx HomePage | 底部快速栏 |
| `.bottom-nav-item` | App.tsx NavBar | 底部导航项 |
| `.hero-banner-btn` | App.tsx HomePage | Hero Banner 按钮 |
| `.daily-row` | App.tsx HomePage | 每日任务行 |

### ARIA 标签
- 底部导航 `<nav aria-label="主导航">`
- 模态框 `role="dialog" aria-modal="true" aria-labelledby="modal-title"`
- 快捷入口区 `<section aria-label="快速入口">`
- 滚动活动区 `<section aria-label="限时活动">`
- Skip link: `<a href="#main-content" class="skip-link">跳转到主要内容</a>`

### Skip Link 样式
```css
.skip-link {
  position: fixed; top: -100px; left: 16px; z-index: 9999;
  padding: 8px 16px; background: var(--brand-primary); color: #fff;
  border-radius: 8px; font-size: var(--text-sm);
  transition: top 0.2s;
}
.skip-link:focus { top: 16px; }
```

---

## 3. 骨架屏替换（Skeleton Screens）

### 原则
用 `<Skeleton />` 组件替换各页面的 LoadingSpinner，逐步替换，不改 API 结构。

### 替换计划
| 页面 | 替换内容 |
|---|---|
| LoginPage | 登录表单区域 → 3个 Skeleton 条 |
| RegisterPage | 注册表单区域 → 3个 Skeleton 条 |
| HomePage | stats center 三个 stat-big → Skeleton |
| GachaDrawer | 抽卡结果加载中 → 抽卡结果骨架卡 |
| GalleryPage | 卡片列表加载中 → 骨架网格 |
| InventoryPage | 背包列表 → 骨架网格 |

### Skeleton 组件使用
现有 `<Skeleton />` 组件在 `src/renderer/components/common/Skeleton.tsx`，暴露接口：
```tsx
<Skeleton width="100%" height="20px" borderRadius="8px" />
<Skeleton width="60%" height="16px" borderRadius="6px" />
```

---

## 4. 色彩饱和度优化（Color Desaturation）

### 原则
不改主题大方向（霓虹感保持），只降低全局高饱和度色的强度，减少视觉疲劳。

### 具体调整
```css
/* bg-card: 粉紫浓度降低 */
--bg-card: rgba(200, 80, 130, 0.07);  /* 原 0.12 → 0.07 */

/* bg-card-hover: hover 时轻微提亮 */
--bg-card-hover: rgba(200, 80, 130, 0.10);  /* 原 0.15 → 0.10 */

/* border: 边框饱和度微降 */
--border-default: rgba(255, 255, 255, 0.10);  /* 原 0.12 → 0.10 */
--border-strong: rgba(255, 255, 255, 0.16);   /* 原 0.20 → 0.16 */

/* 主页 Nebula: 降低叠加色浓度 */
.home-page::before {
  background:
    radial-gradient(ellipse 80% 60% at 20% 20%, rgba(160,30,160,0.12) 0%, transparent 60%),  /* 原 0.18 → 0.12 */
    radial-gradient(ellipse 60% 80% at 80% 80%, rgba(0,60,160,0.10) 0%, transparent 60%),   /* 原 0.15 → 0.10 */
    radial-gradient(ellipse 50% 50% at 50% 10%, rgba(255,50,140,0.08) 0%, transparent 55%); /* 原 0.12 → 0.08 */
}
```

---

## 实施顺序

1. **动效精简** — 改动最多，先清掉
2. **色彩饱和度** — CSS 变量一处改动，全局生效
3. **骨架屏** — 多文件逐一替换
4. **键盘导航 + ARIA** — App.tsx 集中处理

## 验证清单

- [ ] 首页无星点粒子，无浮游粒子
- [ ] 卡片 hover 无 translateY，只有边框+阴影变化
- [ ] Tab 键可导航到所有快捷入口和底部导航
- [ ] Skip link 可见并可跳转
- [ ] 登录/注册页面显示骨架屏而非 spinner
- [ ] 首页 stats 显示骨架屏
- [ ] 整体色彩仍然偏粉紫霓虹，但不再刺眼
- [ ] `npm run build` 无报错
