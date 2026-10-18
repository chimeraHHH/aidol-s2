# 小咪 · AIdol S2

> **陪伴式宠物体重管理** Web 原型 · 京东 Aidol 创造营 S2  
> 把「称重 → 陪伴 → 健康洞察 → 社区发现」串成一条完整产品故事。

<p align="center">
  <img src="app/public/images/companion/mijiang-lick-paw.gif" alt="咪酱舔爪动画" width="280" />
  &nbsp;
  <img src="app/public/images/xiaomi-product.jpg" alt="体脂秤产品图" width="280" />
</p>

<p align="center">
  <a href="https://aidol-s2.vercel.app"><b>🚀 在线体验</b></a>
  &nbsp;·&nbsp;
  <a href="https://github.com/chimeraHHH/aidol-s2">GitHub 主仓</a>
  &nbsp;·&nbsp;
  <a href="https://github.com/chx0506/xiaomi-app">备份仓</a>
</p>

---

## 目录

- [项目简介](#项目简介)
- [在线演示](#在线演示)
- [App 连接小咪实物秤（蓝牙）](#app-连接小咪实物秤蓝牙)
- [实物蓝牙串口联调](#实物蓝牙串口联调)
- [功能地图](#功能地图)
- [信息架构与路由](#信息架构与路由)
- [设计语言](#设计语言)
- [快速开始](#快速开始)
- [技术栈](#技术栈)
- [目录结构](#目录结构)
- [架构与扩展](#架构与扩展)
- [数据与 Mock](#数据与-mock)
- [部署（Vercel）](#部署vercel)
- [AIdol S2 赛题背景](#aidol-s2-赛题背景)
- [协作说明](#协作说明)
- [License](#license)

---

## 项目简介

**小咪**是面向宠物主人的移动端 Web 原型：把体脂秤称重能力，和「回家跟猫咪说说话」的情感陪伴放在同一条体验链上。

| 维度 | 说明 |
|------|------|
| 形态 | React + Vite SPA；桌面端 iPhone 手机框，窄屏全屏 App |
| 定位 | AIdol S2 路演 / 交互演示层（非生产固件） |
| 数据 | Mock：`localStorage` + 体重仿真序列 |
| 视觉 | 奶油暖色、可可棕强调、卡片磨砂玻璃、近乎不透明底栏 |
| 在线 | https://aidol-s2.vercel.app |

**一句话叙事：**  
主人用秤「见面」称重 → 健康页看趋势 → 陪伴页和咪酱聊天 → 发现页逛宠友与知识 →「我的」管理档案与设备。

---

## 在线演示

| 环境 | 地址 |
|------|------|
| Production | https://aidol-s2.vercel.app |
| 源码 | https://github.com/chimeraHHH/aidol-s2 |

建议用手机浏览器打开，或桌面端拉窄窗口体验全屏；宽屏会看到带 Dynamic Island 的手机框。

---

## App 连接小咪实物秤（蓝牙）

App 已内置小咪的蓝牙连接：在本机用 Chrome 打开 App，就能直接连上小咪猫窝秤，实时体重流进「称重」「健康」「我的」页面。

**为什么用 Web Serial 而不是 Web Bluetooth：** 小咪上的 JDY-31 是**经典蓝牙 SPP（串口）**模块，Web Bluetooth 只支持低功耗蓝牙（BLE），连不上它。macOS 系统蓝牙配对后会生成串口 `/dev/cu.JDY-31-SPP`，Chrome 通过 Web Serial 打开这个串口即可收数据（2026-10-17 已实测，见下一节）。

### 1. 配对（只需一次）

1. 给小咪通电。
2. Mac「系统设置 → 蓝牙」里找到 **`JDY-31-SPP`**，点连接；要配对码时输入 **`1234`**。
3. 可选验证：终端执行 `ls /dev/cu.*`，应能看到 `/dev/cu.JDY-31-SPP`。
4. 关掉其他占用小咪的程序（手机串口助手、`firmware/` 里的网页实验台或原生接收工具），一个串口同一时间只能被一个程序打开。

### 2. 本地运行 App

```bash
cd app
npm install --legacy-peer-deps
npm run dev          # 打开 http://localhost:5173
```

必须用 **Chrome（或 Edge）**，并且地址是 **`http://localhost`** 或 `127.0.0.1`（Web Serial 只在安全上下文可用；局域网 IP 的 http 地址不行，Safari / 微信内置浏览器也不行）。也可以 `npm run build && npm run preview`（端口 4173）。

### 3. 在 App 里连接

1. 底栏 **「我的」→「猫窝体重秤」** 卡片，选 **「实物蓝牙」**（在 localhost + Chrome 下默认就是它）。
2. 点 **「连接小咪」**，Chrome 弹出设备选择器，选 **`cu.JDY-31-SPP`**（如果同时出现 `JDY-31-SPP - Paired`，已验证可用的是 `cu.` 那个），点「连接」。
3. 状态变成「已连接」，卡片里出现 **实时读数 x.x kg**，每 1–1.5 秒刷新一次。
4. 点 **「开始测量」**（或健康页的称重入口）：空窝时提示「请让小猫上秤」→ 猫进窝读数跳动 →**连续 3 帧相差 ≤0.1 kg** 自动锁定 → 保存记录，健康页「当前体重」和趋势同步更新。
5. 同一浏览器再次打开时会自动重连已授权过的小咪；没连上就再点一次「连接小咪」。

**断开与异常：** 点「断开连接」主动断开；秤关机、蓝牙掉线时状态自动变为「未连接」并提示原因，称重中断会提示重新连接。读数超过 30 kg（如未去皮的 `963.9Kg`）不会被锁定，只提示检查秤。

### 4. 没有硬件：演示模式

「我的 → 猫窝体重秤」切到 **「演示模式」**（或称重页点「没有硬件？用演示模式」）。App 会按固件**完全相同的 GBK 报文格式**生成模拟数据流（空窝 → 进窝晃动 → 趴稳 → 离开），还会随机拆包、混入噪声字节，走和实物相同的解析链路。演示数据在界面上标注「演示数据 · 非实物测量」。线上 Vercel 版本（非 localhost）默认就是演示模式。

### 数据协议（固件 → App）

| 项 | 值 |
|----|----|
| 链路 | JDY-31 经典蓝牙 SPP → macOS `cu.JDY-31-SPP` → Chrome Web Serial |
| 串口参数 | 9600 baud，8 数据位，无校验，1 停止位，无流控 |
| 编码 | GBK 文本，CR/LF 分行 |
| 一帧 | `身高:1.70m 体重:3.2Kg ⏎ BMI值:--.- ⏎⏎`（约 38 字节，每 1–1.5 秒一帧，设备主动推送，App 不发送任何命令） |
| 兼容写法 | `H:0.06m G:963.9Kg`、`W:3200g`、`重量：0.0kg`、`距离：0.06m` |
| 取用字段 | 体重（kg / g 自动换算成 kg）；身高 / 距离与设备 BMI 只透传、不用于猫咪健康判断；`--.-` 视为空值 |

代码位置：`app/src/services/serial/`

- `scaleProtocol.ts`：分行解码（GBK 汉字跨包、无换行长噪声保护）、字段解析、读数组帧、稳定判定、演示报文生成
- `webSerial.ts`：Web Serial 连接 / 读循环 / 断开清理 / 错误提示（移植自 `firmware/health-scale-51/web-client`）
- `demoScaleSource.ts`：演示模式的模拟数据流
- `ScaleDeviceService.ts`：实现 `IDeviceService`，在 `createServices.ts` 注入；UI 只通过 `useAppData()` 拿 `device`（状态、`liveReading`）和 `connectDevice / disconnectDevice / setDeviceMode`

自测（协议、拆包、噪声、稳定锁定、连接 / 取消 / 掉线、演示流程）：

```bash
cd app && npm run test:serial
```

---

## 实物蓝牙串口联调

新增独立的 [JDY-31 健康秤网页实验台](firmware/health-scale-51/README.md)，用于接收开发板真实串口报文、查看重量曲线和调试 ASCII / HEX 命令。

```sh
cd firmware/health-scale-51/web-client
python3 serve.py --port 18765
```

在 Chrome 打开 `http://127.0.0.1:18765`。macOS 已验证的连接路径为「真实设备」→「USB / 系统串口」→ `cu.JDY-31-SPP`，参数 9600、8-N-1、GBK。直接蓝牙路径出现 `SDP query timeout` 时使用此系统映射串口。

2026-10-17 已验证网页实时接收，RX 与样本数连续增长；[实测汇总](firmware/health-scale-51/validation/web-live-20261017.json) 单独记录传输验证与尚未验证的测量精度。该实验台与上面的产品业务页面分开运行。

---

## 功能地图

| 模块 | 能力要点 |
|------|----------|
| **首页** | 宠窝主页、通知 / 搜索 / 发帖入口、宠物状态 |
| **陪伴** | 与小咪对话（健康 Agent + 方舟大模型 / Mock）、Memory、TTS 标记、场景氛围 |
| **健康** | 体重序列图、日/月/年切换、生活方式指标、称重入口 |
| **发现** | 社区帖、知识卡片、用户头像墙 |
| **我的** | 档案、亲密度、设备连接、隐私 / 展示偏好 |
| **称重流** | `/weigh` 见面测量流程（独立页，不占 Tab） |
| **子流** | 通知中心、发帖、搜索 |

---

## 信息架构与路由

### 底部导航（5 Tab）

| Tab | 路由 | 说明 |
|-----|------|------|
| 首页 | `/home1` | 宠窝首页 |
| 陪伴 | `/` | 对话陪伴（默认入口） |
| 健康 | `/trends` | 体重与健康 |
| 发现 | `/discover` | 社区与知识 |
| 我的 | `/settings` | 档案与设置 |

### 其它路由

| 路径 | 说明 |
|------|------|
| `/weigh` | 称重见面流程 |
| `/notifications` | 通知中心 |
| `/compose` | 发帖 / 创作 |
| `/search` | 搜索 |
| `/companion` | 重定向到 `/` |
| `/paimomo/*` | 重定向到 `/home1` |

```text
┌──────────────────────────────────┐
│           Status Bar             │
├──────────────────────────────────┤
│                                  │
│        页面内容（可滚动）          │
│                                  │
├──────────────────────────────────┤
│   首页 · 陪伴 · 健康 · 发现 · 我的  │  ← 近乎不透明底栏
└──────────────────────────────────┘
```

---

## 设计语言

- **色板**：雾化奶油底 `#f2f0ed` 系 + 可可棕强调 `#6b4235` + 暖茶点缀 `#c48a5a`
- **字体**：Outfit + PingFang SC（数字用等宽感数字字体栈）
- **圆角**：大圆角卡片（约 20–28px），胶囊按钮
- **玻璃**：页面卡片使用半透明白 + `backdrop-filter`；**底部导航近乎不透明**，避免正文透出干扰可读性
- **令牌**：统一写在 `app/src/app/styles/tokens.css`（含 `--xm-glass*`）

---

## 快速开始

### 环境

- Node.js **20+**（推荐）
- npm

### 安装与开发

需要同时启动 **前端** 与 **后端**（形象生成 / 大模型接口）。

```bash
git clone https://github.com/chimeraHHH/aidol-s2.git
cd aidol-s2

# 后端（默认 :8787）
cd server
cp .env.example .env   # 填入 ARK_API_KEY；可先空着走 Mock
npm install
npm run dev

# 另开终端：前端（默认 :5173，已代理 /api → 8787）
cd ../app
npm install --legacy-peer-deps
npm run dev
```

浏览器打开终端提示地址（默认 `http://localhost:5173`）。  
在 **我的 → 我的猫形象** 可拍照/上传，调用后端 Seedream 生成 3D 形象并应用到陪伴页。

> 使用 `--legacy-peer-deps` 是为了兼容当前依赖解析；请保留此参数。  
> 说明：口语「Seedance」在方舟为视频模型；静态 3D 猫形象走 **Seedream** 图生图，Seedance / 对话接口已在 `server` 预留。

### 脚本

| 命令 | 作用 |
|------|------|
| `npm run dev` | 本地开发（热更新） |
| `npm run build` | `tsc -b` + Vite 生产构建 |
| `npm run preview` | 预览 `dist` |
| `npm run lint` | Oxlint |
| `npm run test:serial` | 小咪蓝牙串口协议与连接自测（Node 内置测试器） |

---

## 技术栈

| 层级 | 选型 |
|------|------|
| UI | React 19 + TypeScript |
| 构建 | Vite 8 |
| 路由 | React Router 7 |
| 样式 | Sass Modules + CSS Design Tokens |
| 质量 | Oxlint |
| 托管 | Vercel（SPA rewrite） |
| 数据 | 接口化 Service + Mock 实现 |

---

## 目录结构

```text
aidol-s2/
├── README.md                      # 本文件
├── app/                           # Web 应用
│   ├── public/images/             # 静态视觉（陪伴 / 健康 / 发现 / 硬件等）
│   ├── vercel.json                # SPA：全部路径 → index.html
│   ├── package.json
│   └── src/
│       ├── app/                   # 壳：路由、Provider、global / tokens
│       ├── domain/                # 领域类型
│       ├── services/
│       │   ├── api/               # 后端 HTTP（形象生成等）
│       │   ├── interfaces/        # IDeviceService / ICatRepository
│       │   ├── mock/              # Mock BLE + LocalCatRepository
│       │   └── createServices.ts  # 组合根（换真机只改这里）
│       ├── features/
│       │   ├── home/              # 陪伴对话（/）
│       │   ├── home1/             # 首页（嵌入 PaiHome）
│       │   ├── trends/            # 健康 / 体重
│       │   ├── discover/          # 发现
│       │   ├── settings/          # 我的（含拍照生成猫形象）
│       │   ├── weigh/             # 称重流
│       │   ├── layout/            # AppLayout + 主内容区
│       │   └── paimomo/           # 通知 / 搜索 / 发帖 / 首页卡片等
│       └── shared/                # PhoneShell、TabBar、StatusBar、Button…
├── server/                        # 后端：Seedream 形象 / LLM 预留
│   ├── src/providers/             # seedream · seedance · chat
│   ├── src/routes/                # /api/health · /avatar · /llm
│   └── .env.example
├── scripts/                       # 体重仿真等辅助脚本
├── _video_frames/                 # 设计参考帧（可选）
└── generated-kittens/             # 生成素材存档（可选）
```

更短的开发入口说明见 [`app/README.md`](app/README.md)。

---

## 架构与扩展

服务层用接口隔离，方便赛后接真机 / 真后端：

1. **接真实硬件**：已用 `ScaleDeviceService`（Web Serial + 演示模式）实现 `IDeviceService` 并在 `createServices.ts` 注入；以后换 BLE 硬件，再写一个实现替换即可。  
2. **接后端**：实现 `ICatRepository`，替换 `LocalCatRepository`；形象生成已走 `server` + `services/api/avatarApi.ts`。  
3. **接大模型**：在 `server/src/providers` 扩展 Seedream / Seedance / Chat；陪伴对话走 `POST /api/companion/chat`（`server/agent` 人格文件 + Memory）；密钥只放 `server/.env`。  
4. **新页面**：在 `features/<name>` 新增，挂到 `app/router.tsx`，必要时加 Tab。  
5. **改视觉**：优先改 `tokens.css`，避免散落魔法数。

```ts
// app/src/services/createServices.ts（示意）
export function createServices() {
  return {
    device: new ScaleDeviceService({ baseDevice: SEED_DEVICE }), // 实物串口 + 演示模式
    cat: new LocalCatRepository(),     // → 换成 API Repository
  }
}
```

---

## 数据与 Mock

- 猫咪档案、陪伴亲密度、测量记录：Mock + `localStorage`；设备状态与体重来自小咪实物（蓝牙串口）或演示模式
- 健康页体重曲线：可由 `scripts/generate_kitten_weight_sim.py` 生成后供 `features/trends/data` 使用
- **体脂率等健康相关展示仅为原型演示**；若改为人工录入，请在 UI 标明数据来源

---

## 部署（Vercel）

当前生产配置：

| 项 | 值 |
|----|-----|
| 项目名 | `aidol-s2` |
| Root Directory | `app/` |
| Framework | Vite |
| Install | `npm install --legacy-peer-deps` |
| Build | `npm run build` |
| Output | `dist` |
| SPA | `vercel.json` rewrite → `/index.html` |

推送 `main` 到 GitHub 后，在 Vercel 触发生产部署（或通过 Vercel CLI / MCP）。  
生产地址：https://aidol-s2.vercel.app

---

## AIdol S2 赛题背景

本仓库同时作为京东 Aidol 创造营 S2 的项目存档。赛前规划中的硬件链路包括：

- 承重训练台 / 坐垫压力开关、7 寸宠物屏、Mac mini  
- ESP32 采集（压力占用、体脂秤 BLE、串口 JSON）  
- UVC 摄像头动作识别（深蹲 / 踏步）与语音提醒  

**本仓库已交付的是 Web 演示层。** 硬件联调与固件以实物记录为准，尚未全部接入本代码库。

---

## 协作说明

| Remote | 地址 |
|--------|------|
| 主仓库 | https://github.com/chimeraHHH/aidol-s2 |
| 备份 | https://github.com/chx0506/xiaomi-app（私有） |

提交作者建议使用已绑定 GitHub 的邮箱，或：

```text
140527484+chx0506@users.noreply.github.com
```

这样贡献记录会正确显示头像（避免灰色默认头像）。

本仓库本地可配置：

```bash
git config --local user.name "Daisy"
git config --local user.email "140527484+chx0506@users.noreply.github.com"
```

---

## License

仅用于 AIdol 创造营展示与学习交流。  
第三方素材（产品图、社区配图、生成图等）版权归原作者所有，请勿用于商业分发。


---

## 参赛提交补充说明（2026年10月18日）

本节补充京东 Aidol 创造营 S2 要求的运行方式、模型与 API、开源组件，以及开赛前已有与 48 小时新增的划分。上方原有说明、图片、链接和历史方案全部保留；其中“小咪”是数字分身名称，当前产品名为 **窝知**，口号为 **窝的猫猫，窝要知道**。早期运动凳、ESP32、摄像头及显示屏选型作为方案演进记录，现场样机按下表理解。

### 1. 实际样机与软硬件范围

| 部分 | 现场方案与本次工作 |
|------|------------------|
| 称重采集 | 赛前采购的 STM32 成品开发套件，配套压力传感器与蓝牙模块；赛期基于已有 CodeX 程序二次开发，实现体重读取与上传 |
| 显示与操作 | 两台智能手机：一台作为显示屏，另一台作为网页版 APP 控制终端 |
| 承托与接触区 | 家用菜板作为托盘，搭配成品猫抓板及猫窝软垫 |
| 连接与固定 | X machine 制作的金属连接柱连接菜板与底层结构，胶带辅助加固，502 用于临时粘接 |
| 底座与外观 | 硬纸板围合基底，外部包裹白色薄锡纸；顶部猫咪造型局部零件在赛期建模并 3D 打印 |
| 测试配套 | 现场临时带来的家养猫咪参与实景演示 |
| 工艺状态 | 生活物料拼装的临时验证手板，尚非量产工艺 |

团队确认的现场采集与上传工作，须与可复现的固件、桥接代码及实机视频共同归档。目前本仓库 `app/src/services/createServices.ts` 仍注入 `MockDeviceService`，其随机读数与演示曲线不能作为真实硬件数据。**STM32 采集程序的具体仓库/目录、原始 CodeX 程序来源、修改记录、工具链、烧录方法、蓝牙协议和上传接口仍待团队补齐**；不能把本 Web 主仓链接同时当作已经齐备的固件入口。

### 2. 可复现的运行方式

环境以当前锁文件为准：Node.js **20.19+ 的 20.x 版本，或 22.12+**；建议使用符合要求的 Node.js 22。上方“Node.js 20+”的概述需结合此处最低版本使用。安装完成后，分别启动两个终端：

```bash
git clone https://github.com/chimeraHHH/aidol-s2.git
cd aidol-s2

# 终端 A：后端
cd server
cp .env.example .env
npm install
npm run dev

# 终端 B：从仓库根目录进入前端
cd app
npm install --legacy-peer-deps
npm run dev
```

Windows PowerShell 中，可用 `Copy-Item .env.example .env` 完成配置模板复制。后端默认端口为 `8787`；前端默认 `5173`，已配置 `/api` 和 `/generated` 到本机后端的代理。前端生产部署可通过 `VITE_API_BASE` 指向实际后端；使用局域网手机访问时，后端地址、网络连通及 `CORS_ORIGIN` 应按实际部署设置。

```bash
# 检查后端是否启动；同时返回模型名称、配置状态和 Mock 状态
curl http://localhost:8787/api/health

# 分别在 app 和 server 目录执行，检查各自的生产构建
npm run build
```

进入网页后，可依次查看猫咪档案、称重流程、趋势和陪伴对话。确认演示模式：未配置对话凭据时会走本地 Mock；未配置图像服务且允许 Mock 时，形象生成可返回示例素材。健康检查中 `chatConfigured`、`drawConfigured`、`arkConfigured` 表示相应配置是否存在，**不代表云端调用已经成功**，应再用实际对话或形象生成验证。

启用图像抠图和视频处理时，相关代码还依赖可执行的 `python3`、Python `rembg` 运行环境（代码可使用 Pillow 裁切透明边），以及 `ffmpeg`。仅运行 `npm install` 不会安装这些系统/Python依赖；需按实际启用路径另行准备。仓库 Dockerfile 已安装 FFmpeg，但未安装 Python/rembg，不能直接视为完整抠图环境。

### 3. 模型与 API 清单

以下按 `server/src/config.ts` 与 providers 实现列出**代码支持及默认配置**。现场最终启用的模型、服务商及是否使用 Mock，应以运行环境和实际调用记录确认；本仓库不保存部署密钥。

| 用途 | 代码中的默认模型或接口 | 配置与说明 |
|------|-----------------------|------------|
| 数字分身对话 | `gpt-4o-mini`；OpenAI兼容 `/chat/completions` | 显式设置匹配的 `CHAT_BASE_URL`、`CHAT_MODEL`、`CHAT_API_KEY`；也支持 `OPENAI_*` 与方舟 `ARK_CHAT_*` 回退 |
| 对话服务地址 | 默认 `https://ark.cn-beijing.volces.com/api/v3` | 默认地址与默认模型字符串不保证可直接组合使用；方舟需填写账号实际可用的模型/接入点 |
| 网关生图 | `gpt-image-1`；images generation/edit 接口 | `DRAW_BASE_URL`、`DRAW_IMAGE_MODEL`、`DRAW_API_KEY`；代码默认地址为第三方 `https://draw.openai-next.com/v1`，不是 OpenAI 官方地址 |
| 网关生视频 | `doubao-seedance-2-0-mini-260615`；videos/tasks 接口 | `DRAW_VIDEO_MODEL`、`DRAW_BASE_URL` 和 `DRAW_API_KEY` |
| 方舟生图 | `doubao-seedream-4-5-251128` | `ARK_API_KEY`、`ARK_IMAGE_BASE_URL`、`ARK_SEEDREAM_MODEL` |
| 方舟生视频 | `doubao-seedance-1-5-pro-251215` | `ARK_API_KEY`、`ARK_SEEDANCE_MODEL`，按账号实际开通模型设置 |
| 本地 Mock | 关键词对话、示例形象及模拟称重 | 不依赖真实模型调用；须与真实采集、实际生图和云端对话分开说明 |

对话优先使用 `CHAT_*` 配置，未配置时按代码回退；形象服务优先选择已配置的 draw 网关，其次方舟，再按开关回退 Mock。不要仅填写 API Key 而忽略模型与接口地址是否匹配。

| 项目 API | 作用 |
|----------|------|
| `GET /api/health` | 服务检查、模型配置及 Mock 状态 |
| `POST /api/companion/chat` | 数字分身对话：档案、人格、知识检索和聊天记忆 |
| `GET /api/companion/memory` | 聊天记忆调试入口 |
| `GET /api/companion/kb/search?q=...` | 知识条目检索调试 |
| `POST /api/avatar/generate` | 上传猫照片，生成专属形象及相关场景素材 |
| `POST /api/llm/chat` | 通用兼容模型对话 |
| `POST /api/llm/video` | 视频模型能力探测 |

知识检索实现为关键词与主题加权的轻量检索，见 `server/src/agent/kbRetriever.ts`；人格与知识源在 `server/agent/`。体重等档案字段当前由前端传给 Agent，不据此宣称已经完成对真实传感器数据库的工具查询。记忆本地保存为文件；Vercel 配置使用 `/tmp` 与进程内兜底，不保证跨实例、冷启动后的长期保留。

### 4. 开源组件与依赖

下表版本取自本次补充前 `e0a6cc8b3ce980d5cb6349a489b186982ca51852` 的两个 `package-lock.json`，便于复核；后续安装升级以对应冻结版本的锁文件为准。

| 组件 | 锁定版本 | 锁文件记录的许可证 | 用途 |
|------|----------|--------------------|------|
| react | 19.3.1 | MIT | 界面渲染 |
| react-dom | 19.3.1 | MIT | 界面渲染 |
| react-router-dom | 7.18.4 | MIT | 前端路由 |
| vite | 8.3.4 | MIT | 前端开发与构建 |
| typescript | 6.0.3 | Apache-2.0 | 类型检查与编译 |
| sass | 1.105.2 | MIT | 样式编译 |
| oxlint | 1.88.0 | MIT | 代码检查 |
| express | 5.3.0 | MIT | 后端HTTP服务 |
| cors | 2.8.6 | MIT | 跨域处理 |
| dotenv | 16.6.1 | BSD-2-Clause | 环境变量加载 |
| multer | 2.4.0 | MIT | 文件上传解析 |
| zod | 3.25.76 | MIT | 请求参数校验 |
| tsx | 4.23.15 | MIT | 运行TypeScript后端 |

图像/媒体处理路径还使用 FFmpeg 与 Python rembg，具体部署版本及许可证应随最终运行环境登记。模型 API 属外部服务，不能将其模型权重、调用权利或第三方素材视为本项目原创开源成果。素材使用范围沿用上方原有 License 说明；已有 CodeX 采集程序的上游链接、版本、许可和团队修改范围需补充。

### 5. 开赛前已有与48小时新增

赛事时间按北京时间 **2026年10月17日00:00至10月18日23:59:59** 划分。赛前存档与采购、外部代码/素材的来源需如实保留；提交时间仅证明归档时间，不能单独证明全部代码均为赛期原创。

赛前仓库基线为 [`832df5fea27ad4f7e858e2722906d817c7e4d945`](https://github.com/chimeraHHH/aidol-s2/commit/832df5fea27ad4f7e858e2722906d817c7e4d945)，北京时间10月16日17:38。该版本 README 明确仅有项目说明，没有应用或固件实现。早期记录中的运动凳、ESP32、摄像头等是计划，并不表示已具备这些功能。

| 功能或成果 | 开赛前已有 | 48小时内新增或改进 | 可复核材料与范围 |
|------------|------------|-------------------|------------------|
| 称重套件 | 已提前采购STM32成品套件；采购时间与到货时间分别登记 | 对采购套件进行程序修改与系统接入 | 团队补充：套件周六中午到场；采购凭证、赛前存档与实物记录 |
| 重量采集程序 | 已有CodeX程序作为二次开发基础 | 实现体重读取、上传；不将基础程序算为团队全部原创 | 需补源代码位置、上游来源、修改记录、固件与实机视频 |
| Web APP | 赛前基线中无应用实现；团队确认现场从零开发 | 猫咪档案、称重/趋势、陪伴、发现等页面及交互 | [`ec08d7db`](https://github.com/chimeraHHH/aidol-s2/commit/ec08d7db) 起的原型提交及后续历史；数据模拟部分按代码标注 |
| Agent后端与形象接口 | 赛前基线中无相应实现 | 人格文件、知识检索、聊天记忆、对话与形象接口 | [`5a14ba94`](https://github.com/chimeraHHH/aidol-s2/commit/5a14ba94) 及其后提交；真实模型启用情况另验 |
| 部署与联调配置 | 赛前基线中无相应实现 | 前端代理、Serverless入口、临时存储与错误处理 | [`3a855fac`](https://github.com/chimeraHHH/aidol-s2/commit/3a855fac)、[`e0a6cc8b`](https://github.com/chimeraHHH/aidol-s2/commit/e0a6cc8b3ce980d5cb6349a489b186982ca51852) |
| 三维模型与局部打印 | 团队确认赛前无3D模型 | 完成猫咪外观建模，并打印局部造型零件 | 最新两份GLB、纹理及实际打印文件/过程照；GLB为外观网格，非整机可制造结构 |
| 实物验证手板 | 无组装完成的窝知整机；成品/生活材料来源另列 | 菜板、猫抓板、软垫、连接柱、纸板、锡纸、胶带及502现场拼装 | 实物与组装过程照片、硬件开发说明书；不宣称量产工艺 |
| 猫咪实景测试 | 未预置测试样本 | 现场临时引入家养猫咪演示 | 实拍与重量记录；不外推为长期或多猫测试结果 |

团队既有采购、使用的第三方代码与API不计为本次新研发；本次新增重点是应用实现、采集程序改造、模型与局部打印、现场手板及联调。材料与模型索引以参赛作品说明及其附件区为准。

### 6. 冻结版本与硬件交付入口

本次追加仅补充文档，不创建 `final` 标签或替团队认定冻结版本。最终提交前，应在实际交付仓库按赛事要求设置 `final`，用 `git rev-parse HEAD` 获取完整40位commit，核对代码、视频和作品说明对应同一版本。硬件需补交实际采集固件及运行/烧录说明；Web主仓不能代替尚未归档的固件。

尚待团队补齐的实物参数、采集代码来源与入口、真实通信接线和协议、最终实际模型配置、实机视频、测量验证与冻结commit，以最终实物和提交材料为准。


## 2026-10-18 最终提交：独立手机表情遥控台

已将独立遥控台完整源码、7段视频素材、测试与部署配置纳入 [`controller/`](controller/README.md)。在线演示：https://wozhi-controller.vercel.app/ 。电脑连接手机后，可切换待机/睡眠、启动/唤醒、称重/开心互动三种状态，以及小黑球、小鱼、寄居蟹、彩色光点四个逗猫视频。手机首次点击开始后循环播放，后续由电脑遥控；称重状态目前手动选择。

源码同步自 `duliangkuan/wozhi-controller` 提交 `e81b0b751b6ede2a22afd23646a82513d187820f`。运行与数据库配置参见子目录README，实际凭据不入库。

本次最终冻结以 **`final` 标签指向的提交** 为准，取代上文“尚未创建final”的历史进度描述。提交表填写 `git rev-parse final^{commit}` 的40位结果；后续开发在 `post-final-development` 或其他新分支进行，不移动或覆盖 `final`。冻结范围与验收边界见 [`SUBMISSION_FREEZE.md`](SUBMISSION_FREEZE.md)。
