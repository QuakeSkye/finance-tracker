# iCost Adapter · 管理前端

更新：2026-10-22。本仓库是独立 Vue 前端，完整 FastAPI 项目位于 Gitee 的 SunCoulson/aifirst-time 仓库 finance-tracker 目录。

## 当前功能

一级导航：**首页 / 账单 / 用户管理 / 系统设置**。

- 首页提供各用户账单入口、近 30 天失败概况及缺少 Key/Token 的配置提醒。
- 账单入口 /bills；每用户独立 /users/{id}/bills，支持筛选、详情与按币种汇总。
- 成功结构化账单保存用于统计，不保存截图、OCR 原文、模型原始响应和成功运行日志。
- 失败日志与账单分开，保留 30 天；无需后台复核或手机回调。
- 管理员维护每用户独立 DeepSeek Key、单个永久有效 Token 与 iCost 映射。普通用户无后台权限。
- Ollama 的配置、启用及按用户切换入口已恢复；默认不启用，不做自动健康轮询和 fallback。

## 本地开发

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
npm run build
```

本地 Vite 将 /api 请求代理到 127.0.0.1:8000；后端需独立启动。

## 公网部署

Cloudflare Workers Builds 跟踪本仓库 main。构建命令 npm run build，部署命令 npx wrangler deploy，根目录为本仓库根。

wrangler.toml 声明 coulson-finance.com 的 Custom Domain，由 Cloudflare 建立 DNS 和证书；仅 Worker 构建成功不代表域名绑定完成。部署身份需拥有对应 zone 的绑定权限。

worker.js 将同源 /api/v1/* 转发到固定 https://api.coulson-finance.com，保留登录 Cookie 和 CSRF 请求头，禁用 API 缓存。其他请求交给静态资源与 SPA 回退。Cloudflare Tunnel 必须转发 /api/v1/* 到本地 FastAPI，管理员接口仍由后端 Session 和 CSRF 校验保护。

验收：首页和 /bills 返回页面；未登录 /api/v1/auth/me 返回 JSON 401；登录后能读取自己的管理页面。DNS、TLS、API、登录应分别验证，不能只检查构建状态。

不要提交 .env、真实凭据、运行数据库、日志或备份。API Key 由管理员通过后端加密保存，绝不嵌入前端构建。

## 本地 Ollama 与无入账预览

系统设置可修改本地服务地址、模型、超时和上下文，保存启用状态后可在用户管理单独切换引擎。手动试识别使用用户映射，只返回参数校验结果，不写账单、失败日志或原图，不打开 iCost。关闭时不自动切换其他引擎。当前本机 glm-ocr 的 4 张样例未通过结构化字段校验，不能把 OCR 文字输出当作可靠账单；正式切换前请先试识别。
