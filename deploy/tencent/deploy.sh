#!/usr/bin/env bash
# 腾讯云 tccli 部署前端到 COS 静态网站
#
# 1) 在 https://console.cloud.tencent.com/cam/capi 创建密钥
# 2) export 下列变量后执行本脚本：
#
#   export TENCENTCLOUD_SECRET_ID=AKIDxxxx
#   export TENCENTCLOUD_SECRET_KEY=xxxx
#   export TENCENTCLOUD_REGION=ap-guangzhou
#   export COS_BUCKET=wozhi-web          # 不含 appid，脚本会自动拼
#   export VITE_API_BASE=https://你的后端公网:8787   # 可选，暂无后端可先不设
#
#   bash deploy/tencent/deploy.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
export PATH="${HOME}/Library/Python/3.9/bin:${HOME}/.local/bin:${PATH}"
export ROOT

REGION="${TENCENTCLOUD_REGION:-ap-guangzhou}"
export TENCENTCLOUD_REGION="${REGION}"

die() { echo "❌ $*" >&2; exit 1; }

[[ -n "${TENCENTCLOUD_SECRET_ID:-}" ]] || die "请设置 TENCENTCLOUD_SECRET_ID"
[[ -n "${TENCENTCLOUD_SECRET_KEY:-}" ]] || die "请设置 TENCENTCLOUD_SECRET_KEY"
[[ -n "${COS_BUCKET:-}" ]] || die "请设置 COS_BUCKET（例如 wozhi-web）"

command -v tccli >/dev/null || die "未找到 tccli，请执行: pip3 install --user tccli"
command -v npm >/dev/null || die "未找到 npm"

mkdir -p "${HOME}/.tccli/log"
cat > "${HOME}/.tccli/default.credential" <<EOF
{
  "secretId": "${TENCENTCLOUD_SECRET_ID}",
  "secretKey": "${TENCENTCLOUD_SECRET_KEY}"
}
EOF
cat > "${HOME}/.tccli/default.configure" <<EOF
{
  "region": "${REGION}",
  "output": "json",
  "arrayCount": 10,
  "warningText": null,
  "cliOutputColor": "auto"
}
EOF

echo "==> 校验密钥 / 读取 AppId"
APP_JSON="$(tccli cam GetUserAppId --region "${REGION}")"
APPID="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["AppId"])' <<<"${APP_JSON}")"
echo "    AppId=${APPID}"

FULL_BUCKET="${COS_BUCKET}"
if [[ "${FULL_BUCKET}" != *"-${APPID}" ]]; then
  FULL_BUCKET="${COS_BUCKET}-${APPID}"
fi
export FULL_BUCKET
echo "    Bucket=${FULL_BUCKET}"

echo "==> 创建/检查 COS 桶"
if ! tccli cos GetBucket --bucket "${FULL_BUCKET}" --region "${REGION}" >/dev/null 2>&1; then
  tccli cos PutBucket --bucket "${FULL_BUCKET}" --region "${REGION}"
fi

echo "==> 开启静态网站（SPA fallback → index.html）"
python3 - <<'PY'
import json, os, subprocess, tempfile
region = os.environ["TENCENTCLOUD_REGION"]
bucket = os.environ["FULL_BUCKET"]
website = {
  "IndexDocument": {"Suffix": "index.html"},
  "ErrorDocument": {"Key": "index.html"},
}
# tccli cos PutBucketWebsite 参数因版本而异，改用 Python SDK
from qcloud_cos import CosConfig, CosS3Client
cfg = CosConfig(Region=region, SecretId=os.environ["TENCENTCLOUD_SECRET_ID"], SecretKey=os.environ["TENCENTCLOUD_SECRET_KEY"])
client = CosS3Client(cfg)
client.put_bucket_website(
    Bucket=bucket,
    WebsiteConfiguration={
        "IndexDocument": {"Suffix": "index.html"},
        "ErrorDocument": {"Key": "index.html"},
    },
)
# 公共读（静态站访问）
try:
    client.put_bucket_acl(Bucket=bucket, ACL="public-read")
except Exception as e:
    print("ACL warn:", e)
print("website ok")
PY

echo "==> 构建前端"
cd "${ROOT}/app"
npm install --legacy-peer-deps
npm run build
[[ -f dist/index.html ]] || die "构建失败：找不到 app/dist/index.html"

echo "==> 上传 dist → cos://${FULL_BUCKET}/"
python3 - <<'PY'
import os, sys
from pathlib import Path
from qcloud_cos import CosConfig, CosS3Client

region = os.environ["TENCENTCLOUD_REGION"]
bucket = os.environ["FULL_BUCKET"]
dist = Path(os.environ["ROOT"]) / "app" / "dist"
cfg = CosConfig(Region=region, SecretId=os.environ["TENCENTCLOUD_SECRET_ID"], SecretKey=os.environ["TENCENTCLOUD_SECRET_KEY"])
client = CosS3Client(cfg)

n = 0
for path in dist.rglob("*"):
    if not path.is_file():
        continue
    key = path.relative_to(dist).as_posix()
    headers = {}
    if key.endswith(".html"):
        headers["ContentType"] = "text/html; charset=utf-8"
        headers["CacheControl"] = "no-cache"
    elif key.endswith(".js"):
        headers["ContentType"] = "application/javascript; charset=utf-8"
    elif key.endswith(".css"):
        headers["ContentType"] = "text/css; charset=utf-8"
    client.upload_file(Bucket=bucket, LocalFilePath=str(path), Key=key, **headers)
    n += 1
    if n % 20 == 0:
        print(f"  uploaded {n} files…")
print(f"  done, {n} files")
PY

SITE="https://${FULL_BUCKET}.cos-website.${REGION}.myqcloud.com"
echo ""
echo "✅ 前端已上线："
echo "   ${SITE}"
echo ""
if [[ -n "${VITE_API_BASE:-}" ]]; then
  echo "本次构建使用了 VITE_API_BASE=${VITE_API_BASE}"
else
  echo "⚠️  未设置 VITE_API_BASE：页面可打开，但生成形象/真对话需另外部署后端。"
  echo "   后端可用 deploy/tencent/Dockerfile 在轻量服务器上运行，再重新："
  echo "   VITE_API_BASE=https://你的后端 bash deploy/tencent/deploy.sh"
fi
