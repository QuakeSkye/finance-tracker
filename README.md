# iCost Adapter（Local AI）

本项目是面向 iCost 的本地 AI 识别适配网关，不再作为完整本地记账软件使用。

iCost 保存最终账单；本项目负责在本机完成图片识别、结构化理解、识别记录保存，以及后续阶段的 iCost 参数生成和映射配置管理。

当前执行蓝图：`blueprint.icost.v4.1.local-ai.codex.md`。旧版 `blueprint.codex.md` 仅保留为历史参考。

## 当前 Stage 10 状态

- 后端已挂载健康检查、识别、快捷指令、记录、映射、系统状态和设置入口。
- 旧流水、清理和关键词规则入口已从主应用移除。
- OCR 上传入口写入新的 `recognition_records` 表，不再写入旧 `ocr_records`。
- 重复图片不会因为相同 hash 被应用层拒绝。
- 已建立 `users`、`admin_sessions`、`shortcut_tokens`、`recognition_records`、`icost_mappings`、`system_settings` 数据基础。
- `recognition_records.source_hash` 仅作为调试字段，数据库索引非唯一。
- 快捷指令接口会返回 iCost payload 和 URL Scheme，并支持 `mark-created` / `mark-failed` 回调。
- 前端保留 Login、Dashboard、Records、RecordDetail、iCost 映射和 Settings。
- Dashboard 显示今日识别、payload、复核、iCost 回调统计，以及 OCR/数据库/隧道状态和最近记录。
- Records 支持查看详情、手动修正、重新生成 iCost payload、复制/打开 iCost URL 和删除。
- Settings 支持管理员密码修改、Shortcut Token 重置和运行配置保存。
- 文档已覆盖本机后端、Cloudflare Tunnel、快捷指令和 iCost 入账闭环。
- 后端核心服务和关键 API 有 `unittest` 覆盖，前端 build 通过。
- Dashboard 不再显示正式账本统计。

旧数据库表会暂时保留，以便后续迁移和历史数据处理；当前主流程不再依赖这些表完成入账。

## 技术栈

| 组件 | 技术 |
|------|------|
| 后端 | FastAPI + SQLAlchemy + Pydantic + SQLite |
| 数据库迁移 | Alembic |
| 本地识别 | Ollama + 多模态 OCR 模型 |
| 前端 | Vue 3 + TypeScript + Vite |
| UI | Element Plus + Tailwind CSS |
| 状态管理 | Pinia |

## 目录结构

- `backend/`: FastAPI API、数据库模型、迁移和服务层
- `frontend/`: Vue 管理后台
- `data/`: SQLite 数据库、日志和缓存
- `docs/`: API 文档与运行手册

## 环境要求

- Python 3.11+
- Node.js 20+
- 本机 Ollama
- 已拉取可用于票据图片识别的本地模型

## 快速启动

### 1. 安装依赖

```bash
cd /home/coulson/aifirst-time
python3 -m venv .venv
source .venv/bin/activate

pip install -r finance-tracker/backend/requirements.txt
cd finance-tracker/frontend
npm install
```

### 2. 准备配置

```bash
cd /home/coulson/aifirst-time/finance-tracker/backend
cp .env.example .env
```

至少检查：

```text
DATABASE_URL=sqlite:///../data/finance.sqlite3
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=glm-ocr
UPLOAD_MAX_SIZE_BYTES=10485760
DEFAULT_PREFERRED_ACTION=shortcut_action
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

前端：

```bash
cd /home/coulson/aifirst-time/finance-tracker/frontend
cp .env.example .env
```

### 3. 数据库迁移

```bash
cd /home/coulson/aifirst-time/finance-tracker/backend
/home/coulson/aifirst-time/.venv/bin/alembic upgrade head
```

### 4. 启动服务

后端：

```bash
cd /home/coulson/aifirst-time/finance-tracker/backend
/home/coulson/aifirst-time/.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

前端：

```bash
cd /home/coulson/aifirst-time/finance-tracker/frontend
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

## 验收命令

```bash
curl http://127.0.0.1:8000/api/v1/health
curl http://127.0.0.1:8000/api/v1/system/status
curl -F "file=@/path/to/test.png" http://127.0.0.1:8000/api/v1/ocr/upload
```

后端测试与前端构建：

```bash
cd /home/coulson/aifirst-time/finance-tracker
python -m unittest discover -s backend/tests -v

cd /home/coulson/aifirst-time/finance-tracker/frontend
npm run build
```

前端访问：`http://127.0.0.1:5173`

## 文档

- API：`docs/api.md`
- 运行手册：`docs/runbook.md`
- Cloudflare Tunnel：`docs/cloudflare-tunnel.md`
- Shortcut 设置：`docs/shortcut-setup.md`
