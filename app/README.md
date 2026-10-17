# 小咪 App（Web）

网页形态的 iOS App 原型：桌面端居中展示 **iPhone 17 Pro Max** 手机框，窄屏自动切换为全屏 App。

## 快速开始

```bash
cd app
npm install --legacy-peer-deps
npm run dev
```

## 架构

```
src/
  app/                 # 壳层：路由、Provider、全局样式
  domain/              # 领域类型（设备 / 称重 / 陪伴）
  services/
    interfaces/        # 可替换端口（IDeviceService / ICatRepository）
    mock/              # 当前 Mock BLE + localStorage
    createServices.ts  # 组合根：换真实 BLE/API 只改这里
  features/            # 按页面/用例分包（home / trends / companion / settings / weigh）
  shared/              # 跨功能 UI、hooks、工具
```

### 扩展约定

1. **接真实硬件**：实现 `IDeviceService`，在 `createServices.ts` 注入。
2. **接后端**：实现 `ICatRepository`，替换 `LocalCatRepository`。
3. **新页面**：在 `features/<name>` 新增，并挂到 `app/router.tsx`。
4. **视觉令牌**：只改 `app/styles/tokens.css`。

## 信息架构

| Tab | 职责 |
|---|---|
| 首页 | 连接状态、陪伴问候、差值摘要、「见面」入口 |
| 趋势 | Δ 曲线优先，绝对体重折叠 |
| 陪伴 | 猫脸表情、能量/默契、人设切换 |
| 我的 | 猫咪档案、设备与隐私说明 |

测量流 `/weigh` 从首页「见面」进入，不占用底部 Tab。
