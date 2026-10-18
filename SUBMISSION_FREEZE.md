# AIdol S2 最终提交冻结说明

## 冻结规则

本次按提交表要求创建名为 `final` 的 Git 标签。评审源码以该标签解引用得到的提交为准，不以之后的分支更新或在线演示变化替代。

```sh
git fetch origin --tags
git rev-parse 'final^{commit}'
```

输出为提交表需要的完整 40 位 commit ID。在冻结提交处执行 `git rev-parse HEAD` 得到相同结果。`git rev-parse final` 对带注释标签可能返回标签对象ID，不应将其误填为commit ID。

冻结后不移动、覆盖或删除 `final`，不在 `main` 继续迭代。后续开发使用 `post-final-development` 或从 `final` 创建的其他分支。此规则固定参赛版本，不归档整个仓库，也不影响其他分支继续开发。是否计入评奖及截止时间由赛事方判定。

## 本次归档内容

- 保留同步前 S2 主分支 `12b5a309cdcc9d3dde1d804d7d2f69b94732dc41` 已有应用、后端、称重通信及固件相关目录。
- 新增 `controller/` 独立遥控网页：完整源代码、锁文件、部署配置、测试、3段状态视频与4段逗猫视频。
- 遥控台来源：`https://github.com/duliangkuan/wozhi-controller`，提交 `e81b0b751b6ede2a22afd23646a82513d187820f`。导入时对34个受版本管理文件逐一校验字节一致。
- 源视频由用户提供；本次做了截取、合并、转码，不将第三方视频创作归为团队原创。
- 新增遥控台所需 PostgreSQL 数据库连接通过 `DATABASE_URL` 配置。真实凭据、数据库内容、`node_modules` 和本地生成目录不随源码提交。

## 演示与运行

遥控网页：<https://wozhi-controller.vercel.app/>。电脑点击连接手机，安卓手机扫码并点开始播放。表情为待机/睡眠、启动/唤醒、称重/开心互动；游戏为小黑球、小鱼、寄居蟹、彩色光点。称重表情当前由电脑手动选择，不能据此声称已自动联动传感器。

运行：进入 `controller/`，执行 `npm ci`、配置独立数据库的 `.env.local`、`npm run build`、`npm start`；详细说明见 `controller/README.md`。Vercel从本仓库部署时将 Root Directory 设置为 `controller`。已有在线项目仍关联独立遥控台仓库；未来线上版本可能更新，源码评审应检出 `final`。

## 验证范围

冻结前检查主应用生产构建与串口测试、后端TypeScript构建、已有固件Web客户端测试，以及新导入遥控台的独立构建和测试。具体结果记录于本次提交交付说明。

此前遥控台正式站API验证已覆盖7种媒体切换、控制/显示角色隔离、不同配对隔离、非法输入、播放设置、心跳回执、视频Range读取；浏览器双端验证了切换、暂停、旋转、恢复配对。安卓实机全屏、横屏锁定、常亮的最终效果仍由现场设备验收，不把浏览器模拟测试等同于实机验收。

### 本次冻结前实际检查结果

- 主应用：`npm run build` 通过；`npm run test:serial` 10/10通过。
- 后端：`npm run build` 通过。
- 固件Web客户端：`node --test tests/*.test.mjs` 12/12通过。
- 遥控台：干净目录 `npm ci`、`npm run build` 通过；`npm test` 4/4通过。
- 修复原串口测试清单遗漏 `nativeBridge`，并修正支持检测注入明确返回 `null`（表示支持）却回退到浏览器环境检测的逻辑；未提供检测注入时仍执行原环境检测。
- 主应用仍有压缩包大于500kB的构建体积提示，不影响本次构建成功。controller内两处文件末尾空行沿用独立仓库原始内容。
