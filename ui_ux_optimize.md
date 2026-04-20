# UI/UX 优化方案

> **更新日期：** 2026/04/17
> **综合评分：** 7.2 / 10

---

## 一、综合评分详情

| 维度 | 得分 | 说明 |
|------|------|------|
| 视觉美学 | 8.5/10 | 赛博朋克/偶像梦幻风格定位清晰，Neon 配色体系完整，粒子/光晕/全息特效有记忆点 |
| 排版与字体 | 7.0/10 | 刚完成 type scale 统一，但仍有 stat 类硬编码，字体层级还不够严格 |
| 动效设计 | 8.0/10 | keyframe 动画丰富，parallax 交互刚加入；遗憾是有 5 个 orphaned keyframe（遗留废弃代码） |
| 组件一致性 | 6.5/10 | 各页面卡片风格接近，但按钮/表单/toggle 组件缺乏统一封装，重复代码多 |
| 交互体验 | 6.5/10 | 搜索需点击按钮触发（无实时反馈），部分 Modal 缺少 loading 态，表单验证反馈不及时 |
| 响应式适配 | 7.0/10 | 有 768px / 480px 断点，但部分页面（大列表/排行榜）在手机上仍显拥挤 |
| 可访问性 | 5.0/10 | 无 ARIA 标签，无键盘导航，focus 状态几乎未处理，对比度部分区域不足 |

---

## 二、主要优点

- 视觉风格统一且有辨识度，不是套模板的 AI 批量生成感
- CSS 变量体系完整（rarity、glow、currency 颜色等），扩展性强
- 动效丰富且有层次，不过度也不单调
- 星尘粒子背景 + 全息边框 + 霓虹发光等特效有品牌调性

---

## 三、主要不足（按优先级排序）

### P1 — 交互体验（最短木板）

| 问题 | 位置 | 说明 |
|------|------|------|
| 搜索无实时反馈 | FriendsPage | 需点击按钮才触发，应 debounce + 实时下拉 |
| Modal 无 loading 态 | 全局 | 异步操作时无 spinner，用户不知在等待 |
| 表单验证反馈弱 | AuthPage | 错误只是红色文字，无 shake/聚焦等反馈 |
| 好友申请无通知 | FriendsPage | 收到申请无 toast/badge 提示，需手动刷新 |

### P2 — 组件一致性

| 问题 | 位置 | 说明 |
|------|------|------|
| 无原子组件库 | 全局 | 按钮/输入框/标签无统一封装，各页面重复内联 |
| 残留废弃 keyframe | 5 个 CSS 文件 | orphaned `from {}/to {}` 碎片遗留，需清理 |
| stat 类硬编码 | neon.css | `.stat-p/.stat-g` 等 4 个类字体写死，应统一变量 |

### P3 — 可访问性

| 问题 | 说明 |
|------|------|
| 无 ARIA 属性 | 按钮/输入框/弹窗均无 aria-label/role |
| 无键盘导航 | tabindex 未处理，弹窗无法键盘关闭 |
| focus 状态缺失 | `:focus` 样式几乎未定义，键盘用户迷失 |

### P4 — 响应式遗留

| 位置 | 问题 |
|------|------|
| 排行榜页面 | 手机端大列表拥挤，间距未压缩 |
| 签到日历 | 月份导航按钮在小屏上间距过窄 |
| 应援留言板 | 长留言未截断，卡片高度不一致 |

---

## 四、已完成项（P3-11, P3-12, P1 部分, P2, P3, P4）

| 任务 | 状态 | 说明 |
|------|------|------|
| P3-11 粒子动画交互 | ✅ | 鼠标 parallax 接入 starFloat 背景 |
| P3-12 字体大小规范 | ✅ | 13 级 type scale 建立，8 个 CSS 文件完成迁移 |
| P1 Modal LoadingSpinner | ✅ | 全局异步操作 LoadingSpinner 组件，登录/注册按钮接入 |
| P1 Auth 禁用状态 | ✅ | `.auth-btn:disabled` 样式，防止加载中重复提交 |
| P1 好友申请通知 Badge | ✅ | BottomNav 菜单-好友按钮显示待处理申请数 badge |
| P2 原子组件 | ✅ | Button、Input、Badge、Tag、Modal 抽取到 components/common/ |
| P2 清理 orphaned keyframe | ✅ | 移除 5 个废弃 keyframe（common.css x2, ranking.css x2） |
| P3 可访问性 | ✅ | 全局 `:focus-visible` 样式、Modal ESC 关闭、aria 属性 |
| P4 响应式修复 | ✅ | ranking.css 手机断点、stamina.css 触摸友好、neon.css 卡片高度 |

---

## 五、优化计划

### Phase 1: 交互体验（P1）
- [x] 修复 FriendsPage 搜索：debounce + 实时下拉 — 已实现（代码确认有 debounce）
- [x] 全局 Modal 添加 LoadingSpinner 组件
- [x] AuthPage 表单验证增强（shake 动画 + 聚焦效果） — shake 动画已存在
- [x] 好友申请实时通知 badge

### Phase 2: 组件抽象（P2）
- [x] 抽取原子组件：`Button`、`Input`、`Badge`、`Tag` 到 `src/renderer/components/common/`
- [x] 清理 5 个 CSS 文件中的 orphaned keyframe 残留
- [x] 统一 stat 类为 CSS 变量 — `neon.css` / `rhythm.css` 中的 `.stat-p/g/ok/m` 改为 `var(--stat-perfect/great/good/miss)`

### Phase 3: 可访问性（P3）
- [x] 关键按钮/输入框添加 aria-label
- [x] 弹窗组件添加 role="dialog" + aria-modal
- [x] 定义全局 `:focus-visible` 样式
- [x] Modal 支持 ESC 键盘关闭

### Phase 4: 响应式修复（P4）
- [x] 排行榜页面手机端适配 — `ranking.css` 添加 `@media (max-width: 480px)` 断点，缩小头像(52→40px)、间距、字号
- [x] 签到日历触摸友好化 — `stamina.css` `.cal-nav-btn` 手机端增大至 44×44px（符合 Apple HIG 最小触摸目标）
- [x] 应援留言板卡片高度统一 — `neon.css` `.msg-item` 添加 `display:flex; flex-direction:column; min-height:70px`

---

## 六、Type Scale 参考（已建立）

```
--text-xs:   10px   (微标签/角标)
--text-sm:   12px   (小字/元数据)
--text-base: 14px   (正文默认)
--text-md:   16px   (中等/默认)
--text-lg:   18px   (大号)
--text-xl:   20px   (特大)
--text-2xl:  24px   (2XL)
--text-3xl:  28px   (3XL)
--text-4xl:  32px   (4XL)
--text-5xl:  40px   (5XL)
--text-6xl:  48px   (6XL)
```
