# 小咪 App（Web）

完整产品说明、截图、架构与部署文档见仓库根目录：

**[../README.md](../README.md)**

## 快速开始

```bash
cd app
npm install --legacy-peer-deps
npm run dev
```

在线体验：https://aidol-s2.vercel.app

## 连接小咪实物秤（蓝牙）

Mac 系统蓝牙配对 `JDY-31-SPP`（PIN `1234`）→ `npm run dev` → **Chrome** 打开 `http://localhost:5173` →「我的 → 猫窝体重秤 → 实物蓝牙 → 连接小咪」→ 选 `cu.JDY-31-SPP`。没有硬件选「演示模式」。

详细步骤与数据协议见根目录 README 的「App 连接小咪实物秤（蓝牙）」。自测：`npm run test:serial`。
