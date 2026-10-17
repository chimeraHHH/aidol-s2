# 小咪 · AIdol S2

> 陪伴式宠物体重管理 Web 原型 —— 京东 Aidol 创造营 S2  
> 在手机框里体验「称重 → 陪伴 → 健康洞察 → 社区发现」的完整体验。

<p align="center">
  <img src="app/public/images/home-room.jpg" alt="小咪首页场景" width="280" />
  &nbsp;
  <img src="app/public/images/companion/mijiang-lick-paw.gif" alt="咪酱舔爪动画" width="280" />
  &nbsp;
  <img src="app/public/images/health/hero-kitten.jpg" alt="健康页猫咪" width="280" />
</p>

<p align="center">
  <a href="https://aidol-s2.vercel.app"><strong>🚀 在线体验</strong></a>
  ·
  <a href="https://github.com/chimeraHHH/aidol-s2">GitHub</a>
  ·
  <a href="#快速开始">本地运行</a>
</p>

---

## 项目简介

**小咪**是一款面向宠物主人的移动端 Web 原型：把「体脂秤称重」和「情感陪伴」放在同一条产品路径上。  
桌面端会居中展示 iPhone 手机框；窄屏设备直接全屏，接近原生 App 体验。

| 维度 | 说明 |
|---|---|
| 形态 | React + Vite SPA，手机框 / 全屏自适应 |
| 定位 | AIdol S2 48 小时原型的产品与交互演示层 |
| 数据 | 当前为 Mock（localStorage + 体重仿真数据） |
| 在线 | [aidol-s2.vercel.app](https://aidol-s2.vercel.app) |

---

## 产品截图

### 陪伴 · 和「小咪」聊天

沉浸式陪伴页：房间场景、猫咪形象、对话气泡与输入栏。  
适合演示「称完体重后，回家和猫咪说说话」的情感闭环。

<p align="center">
  <img src="app/public/images/companion-kitten.jpg" alt="陪伴页猫咪" width="360" />
  &nbsp;
  <img src="app/public/images/companion/mijiang-lick-paw-poster.jpg" alt="舔爪海报帧" width="360" />
</p>

### 健康 · 体重趋势与生活指标

健康 Tab 以体重曲线为主，支持日 / 月 / 年视角，并附带食欲、睡眠、活动等生活方式指标卡片。

<p align="center">
  <img src="app/public/images/health/hero-kitten.jpg" alt="健康页视觉" width="320" />
  &nbsp;
  <img src="app/public/images/health/icon-appetite.jpg" alt="食欲指标" width="160" />
  <img src="app/public/images/health/icon-sleep.jpg" alt="睡眠指标" width="160" />
  <img src="app/public/images/health/icon-activity.jpg" alt="活动指标" width="160" />
</p>

### 发现 · 宠友内容与知识卡

发现页聚合社区帖子与养护知识（饮食、梳毛、饮水、玩耍等），用于演示「称重 App → 内容社区」的延伸。

<p align="center">
  <img src="app/public/images/discover/discover-post-1.jpg" alt="发现帖 1" width="200" />
  <img src="app/public/images/discover/discover-post-2.jpg" alt="发现帖 2" width="200" />
  <img src="app/public/images/discover/knowledge-food.jpg" alt="饮食知识" width="200" />
  <img src="app/public/images/discover/knowledge-groom.jpg" alt="梳毛知识" width="200" />
</p>

### 我的 · 档案与设备

个人页展示猫咪档案横幅、设备信息入口，承接「硬件 + 软件」一体叙事。

<p align="center">
  <img src="app/public/images/settings/profile-banner.jpg" alt="我的页横幅" width="420" />
</p>

### 硬件意象 · 小米体脂秤

原型视觉中接入产品与爆炸图素材，方便路演时把「秤」和「App」讲在同一画面里。

<p align="center">
  <img src="app/public/images/xiaomi-product.jpg" alt="体脂秤产品图" width="280" />
  &nbsp;
  <img src="app/public/images/xiaomi-exploded.jpg" alt="体脂秤爆炸图" width="280" />
</p>

---

## 信息架构

底部五个主 Tab：

| Tab | 路由 | 职责 |
|---|---|---|
| 首页 | `/home1` | 宠窝首页 / 场景入口 |
| 陪伴 | `/` | 与小咪对话、情感互动 |
| 健康 | `/trends` | 体重趋势、健康指标、分析摘要 |
| 发现 | `/discover` | 社区内容与养护知识 |
| 我的 | `/settings` | 猫咪档案、设备与设置 |

其它独立流：

| 路径 | 说明 |
|---|---|
| `/weigh` | 称重见面流程（不占用底部 Tab） |
| `/notifications` | 通知中心 |
| `/compose` | 发帖 / 创作 |
| `/search` | 搜索 |

```text
┌─────────────────────────────────────┐
│           Status Bar                │
├─────────────────────────────────────┤
│                                     │
│     首页 │ 陪伴 │ 健康 │ 发现 │ 我的   │
│                                     │
│         （页面内容区）                │
│                                     │
├─────────────────────────────────────┤
│            Tab Bar                  │
└─────────────────────────────────────┘
```

---

## 快速开始

### 环境要求

- Node.js 20+（推荐）
- npm

### 安装与启动

```bash
git clone https://github.com/chimeraHHH/aidol-s2.git
cd aidol-s2/app
npm install --legacy-peer-deps
npm run dev
```

浏览器打开终端提示的本地地址（默认 `http://localhost:5173`）。

### 常用脚本

| 命令 | 作用 |
|---|---|
| `npm run dev` | 本地开发（热更新） |
| `npm run build` | TypeScript 检查 + 生产构建 |
| `npm run preview` | 预览 `dist` |
| `npm run lint` | Oxlint 静态检查 |

---

## 技术栈

| 层级 | 选型 |
|---|---|
| 框架 | React 19 + TypeScript |
| 构建 | Vite 8 |
| 路由 | React Router 7 |
| 样式 | Sass Modules + CSS 设计令牌 |
| 部署 | Vercel（SPA rewrite） |
| 数据 | Mock Service + localStorage |

---

## 目录结构

```text
aidol-s2/
├── README.md                 # 本文件
├── app/                      # Web 应用根目录
│   ├── public/images/        # 静态视觉资源
│   ├── vercel.json           # SPA 路由回退
│   └── src/
│       ├── app/              # 壳层：路由、Provider、全局样式
│       ├── domain/           # 领域类型（设备 / 称重 / 陪伴）
│       ├── services/         # 可替换端口 + Mock 实现
│       ├── features/         # 按页面分包
│       │   ├── home/         # 陪伴对话
│       │   ├── home1/        # 首页
│       │   ├── trends/       # 健康 / 体重
│       │   ├── discover/     # 发现
│       │   ├── settings/     # 我的
│       │   ├── weigh/        # 称重流
│       │   └── paimomo/      # 通知 / 搜索 / 发帖等子流
│       └── shared/           # TabBar、PhoneShell、StatusBar 等
├── scripts/                  # 体重仿真等辅助脚本
├── _video_frames/            # 设计参考帧（可选）
└── generated-kittens/        # 生成素材存档（可选）
```

---

## 架构约定

服务层用接口隔离，方便赛后接真机 / 真后端：

1. **接真实硬件**：实现 `IDeviceService`，在 `createServices.ts` 注入。
2. **接后端**：实现 `ICatRepository`，替换 `LocalCatRepository`。
3. **新页面**：在 `features/<name>` 新增，并挂到 `app/router.tsx`。
4. **视觉令牌**：只改 `src/app/styles/tokens.css`，避免散落魔法数。

当前称重与陪伴数据来自 Mock：体重序列可由 `scripts/generate_kitten_weight_sim.py` 生成后供健康页使用。

---

## 在线部署

- 生产地址：https://aidol-s2.vercel.app  
- 构建根目录：`app/`  
- 框架：Vite  
- 安装命令：`npm install --legacy-peer-deps`  
- SPA：`vercel.json` 将所有路径 rewrite 到 `index.html`

推送到 `main` 后，可在 Vercel 后台触发重新部署；或使用 Vercel CLI / MCP 发布。

---

## AIdol S2 赛题背景（存档）

本仓库同时作为京东 Aidol 创造营 S2 的项目存档。赛前规划中的硬件链路包括：

- 承重训练台 / 坐垫压力开关、7 寸宠物屏、Mac mini  
- ESP32 采集固件（压力占用、体脂秤 BLE、串口 JSON）  
- UVC 摄像头动作识别（深蹲 / 踏步）与语音提醒  

**Web 原型是当前已交付的演示层**；硬件联调与固件以实物记录为准，尚未全部接入本仓库。

体脂率等医学相关展示若改为人工录入，界面中会标明数据来源。

---

## 仓库与协作

| Remote | 地址 |
|---|---|
| 主仓库 | https://github.com/chimeraHHH/aidol-s2 |
| 备份 | https://github.com/chx0506/xiaomi-app |

建议提交作者使用已绑定 GitHub 的邮箱（或 `ID+username@users.noreply.github.com`），以便贡献记录正确显示头像。

---

## License

仅用于 AIdol 创造营展示与学习交流。第三方素材（产品图、社区配图等）版权归原作者所有，请勿用于商业分发。
