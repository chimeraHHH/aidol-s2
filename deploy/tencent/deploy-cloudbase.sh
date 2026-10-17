#!/usr/bin/env bash
# CloudBase：前端静态托管 + 后端云托管（容器，可带 ffmpeg）
#
# 登录（二选一）：
#   A) tcb login --apiKeyId "$TENCENTCLOUD_SECRET_ID" --apiKey "$TENCENTCLOUD_SECRET_KEY"
#   B) tcb login   # 浏览器/设备授权
#
# 然后：
#   export TCB_ENV_ID=你的环境ID
#   export VITE_API_BASE=   # 先空着，后端部署完再填公网地址二次构建
#   bash deploy/tencent/deploy-cloudbase.sh
#
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
export PATH="${HOME}/.local/node20/bin:${HOME}/Library/Python/3.9/bin:${PATH}"
cd "$ROOT"

die() { echo "❌ $*" >&2; exit 1; }
command -v tcb >/dev/null || die "请先 npm i -g @cloudbase/cli"

ENV_ID="${TCB_ENV_ID:-${CLOUDBASE_ENV_ID:-}}"
[[ -n "$ENV_ID" ]] || die "请设置 TCB_ENV_ID（云开发环境 ID，控制台可见）"

# 写入 envId
python3 - <<PY
import json
from pathlib import Path
p = Path("cloudbaserc.json")
data = json.loads(p.read_text())
data["envId"] = "${ENV_ID}"
p.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
print("envId ->", data["envId"])
PY

echo "==> 1/3 部署后端到云托管（容器 · 端口 8787 · 公网访问）"
tcb cloudrun deploy \
  -e "${ENV_ID}" \
  -s wozhi-api \
  --source ./server \
  --port 8787 \
  --force \
  --wait \
  --open-access-types PUBLIC \
  --min-num 0 \
  --max-num 3

echo "==> 查询云托管访问地址"
tcb cloudrun list -e "${ENV_ID}" 2>&1 | head -40 || true

echo ""
echo "请把上面服务的公网域名填到 VITE_API_BASE，例如："
echo "  export VITE_API_BASE=https://wozhi-api-xxxx.service.tcloudbase.com"
echo "然后继续构建并部署前端……"
echo ""

if [[ -z "${VITE_API_BASE:-}" ]]; then
  echo "⚠️  VITE_API_BASE 未设置：先只部署前端（对话/生图会失败，直到二次部署）。"
fi

echo "==> 2/3 构建前端"
cd "$ROOT/app"
npm install --legacy-peer-deps
npm run build

echo "==> 3/3 部署静态托管"
cd "$ROOT"
tcb hosting deploy ./app/dist -e "${ENV_ID}" --force 2>&1 || \
  tcb hosting:deploy ./app/dist -e "${ENV_ID}" 2>&1

echo ""
echo "✅ 完成。查看静态站地址："
tcb hosting detail -e "${ENV_ID}" 2>&1 | head -40 || true
