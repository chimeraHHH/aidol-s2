# 小咪后端 · LLM / 形象生成

为 Web 原型提供：

| 接口 | 说明 |
|------|------|
| `GET /api/health` | 健康检查与模型配置 |
| `POST /api/avatar/generate` | 上传猫照 → GPT 生图（draw）或 Seedream → 视频 → ffmpeg 循环 |
| `POST /api/llm/chat` | 对话大模型 |
| `POST /api/companion/chat` | **小猫健康 Agent** 对话（AGENTS/SOUL/USER + Memory + KB RAG） |
| `GET /api/companion/memory` | 查看用户 Memory（调试） |
| `GET /api/companion/kb/search?q=` | 调试知识库检索 |
| `POST /api/llm/video` | 视频能力探测 |

### draw.openai-next.com（优先）

- `DRAW_API_KEY` + `DRAW_BASE_URL=https://draw.openai-next.com/v1`
- 生图：`gpt-image-1`（`/images/generations`、`/images/edits`）已通
- 生视频：**有**。推荐 `doubao-seedance-2-0-mini-260615`（`POST /videos` + `GET /tasks/{id}`）  
  `sora-2-hd` 在该站可能因价目未配置返回 403
- 未配 DRAW 时回退方舟 `ARK_*`，再走 Mock

## 快速开始

```bash
cd server
cp .env.example .env
# 编辑 .env：填入 DRAW_API_KEY（GPT 生图网关）
npm install
npm run start
```

默认端口 `8787`。前端 Vite 已代理 `/api` 与 `/generated`。

## 生成形象

```bash
curl -X POST http://localhost:8787/api/avatar/generate \
  -F "photo=@/path/to/cat.jpg"
```

成功时返回：

```json
{
  "ok": true,
  "imageUrl": "/generated/avatar-….png",
  "provider": "seedream",
  "mock": false
}
```

未配置 `ARK_API_KEY` 且 `ALLOW_MOCK_AVATAR=true` 时，返回本地示例 3D 图（`mock: true`），便于联调 UI。

## 陪伴 Agent（数字分身）

人格与规则放在 `server/agent/`（对齐小智 / Workbuddy 式分身文件）：

| 文件 | 作用 |
|------|------|
| `AGENTS.md` | 职责、边界、输出 JSON 契约 |
| `SOUL.md` | 性格与价值观 |
| `IDENTITY.md` | 对外自称 |
| `USER.md` | 主人/猫咪档案模板（运行时注入动态字段） |

Memory 落盘：`server/data/memory/<userId>.json`。

健康知识库（RAG）：`server/agent/knowledge/kb.json`（结构化）+ `语料知识库.md`。  
对话前按用户问题做关键词/主题检索，将 Top-K 条目与档案推导事实注入 system prompt。

```bash
curl -s http://localhost:8787/api/companion/chat \
  -H 'Content-Type: application/json' \
  -d '{"userId":"demo","message":"今天体重怎么样？","profile":{"catName":"咪酱","latestWeightKg":4.35}}'
```

未配置 `ARK_API_KEY` 时走本地关键词 Mock，仍会写入 Memory。

## 环境变量

见 [`.env.example`](./.env.example)。模型 ID 请以方舟控制台「在线推理」里你开通的接入点为准。
