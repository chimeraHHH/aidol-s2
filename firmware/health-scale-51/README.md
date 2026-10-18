# JDY-31 健康秤网页联调

独立运行的开发板联调工具，提供浏览器串口实验台，以及可选的 macOS 原生接收工具。主产品 `app/` 的业务页面与这套联调页面分开运行。

## 网页实时数据

```sh
cd firmware/health-scale-51/web-client
python3 serve.py --port 18765
```

在 Chrome 打开 `http://127.0.0.1:18765`。本次 macOS 验证成功的设置为：

- 测试方式：真实设备。
- 连接方式：USB / 系统串口。
- 选择器中的设备：`cu.JDY-31-SPP`。
- 参数：9600、8-N-1、GBK。

系统蓝牙先配对 JDY-31-SPP；模块手册中的默认 PIN 为 `1234`。Chrome 直接 RFCOMM 路径曾报 `SDP query timeout`，系统映射串口路径已验证实时接收。

功能、命令、测试和连接排查见 [网页版说明](web-client/README.md)。[实测汇总](validation/web-live-20261017.json) 记录了网页 RX 和样本数增长；没有发布设备地址、原始测量日志或供应方 APK。传输验证不等于称重精度、身高或 BMI 已验证。

## macOS 原生接收工具

需要 macOS、Xcode 或 Command Line Tools。于仓库根目录执行：

```sh
sh firmware/health-scale-51/tools/build_physical_reader.sh
open firmware/health-scale-51/build/PhysicalScaleReader.app
```

应用启动时只查找已配对且名称完全匹配 `JDY-31-SPP` 的设备；也提供主动经典蓝牙扫描和系统设备选择器。扫描必须仅发现一个精确匹配目标才会尝试配对；PIN 请求使用原模块默认值 `1234`。系统设备选择器会验证 SPP 服务，选择其他名称会被拒绝。

接收工具会打开该设备的 SPP RFCOMM 通道，被动保存原始字节和连接事件至 `build/physical/`。关闭窗口会结束连接。工具不自动发送测量、AT、复位、烧写或校准命令。运行原生工具和网页时需要交替使用，避免同时占用模块。

## 本地验证

```sh
cd firmware/health-scale-51/web-client
npm test
```

测试使用 Node 内置测试器，不依赖第三方测试包；协议模拟、串口 mock 测试与实物验证分别记录。
