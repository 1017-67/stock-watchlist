# 投资笔记

「投资笔记」是一个用于记录想法、检查风险、帮助复盘的小型中文 Web App。它可以管理自选股、记录持仓、查看真实行情和价格走势，并在买卖前整理交易计划。

重要提醒：仅供思考参考，不构成投资建议。本工具不提供价格预测、交易指令或任何直接金融建议。

## 功能

- 自选股：搜索真实股票，添加关注理由、个人判断和备注。
- 已持有：记录持有数量、平均买入价、买入日期，并用最新报价计算持仓市值和浮动盈亏。
- 价格走势：通过后端行情服务加载历史价格，支持 1日、1周、1月、6月、1年。
- 买卖前检查：在保存交易想法前做本地风险检查。
- AI 思考辅助：前端调用本地 `/api/ai/analyze-trade`，服务端优先使用 Lunaris Codex provider/runtime。
- 问 AI：在页面内围绕当前股票和笔记继续提问，前端只调用本地 `/api/ai/chat`。
- 交易笔记：保存交易计划、本地检查结果、AI 分析结果，并支持 1 周后、1 个月后复盘。

## 安装

```bash
npm install
```

## 配置行情 API

复制环境变量示例：

```bash
cp .env.example .env.local
```

在 `.env.local` 填入服务端环境变量：

```bash
FINNHUB_API_KEY=你的 Finnhub API key
ALPHA_VANTAGE_API_KEY=
VITE_API_BASE_URL=http://127.0.0.1:8787
```

Finnhub key 可以在 [Finnhub](https://finnhub.io/) 注册后获取。当前 v1 使用 Finnhub 的 symbol search、quote 和 candle API。代码已经把 `marketDataService` 独立出来，后续可以在同一层加入 Alpha Vantage fallback。

不要把行情 key 写进前端代码。前端只调用本地 `/api/market/...` 路由。

如果在 Windows 或 `npm run preview` 下看到 API JSON 正常、但页面里的图表不显示，确认 `.env.local` 里有：

```bash
VITE_API_BASE_URL=http://127.0.0.1:8787
```

这个值不是密钥，只是告诉前端在 `/api` 代理不可用时直接连接本地 API 服务。

## AI 连接方式

本项目沿用 Lunaris 的 provider/auth 分离思路：

- UI 只调用本地 `POST /api/ai/analyze-trade` 和 `POST /api/ai/chat`。
- provider、模型选择和认证逻辑留在服务端。
- 不在浏览器中输入或保存 Codex/OpenAI key。
- 不把 token 暴露给前端 bundle。

服务端文件：

- `server/codexAnalysisService.js`

默认会按 Lunaris 当前方向使用 Codex 作为服务端 auth/runtime 层：

```bash
codex -a never exec -m gpt-5.5 -s read-only --skip-git-repo-check --ephemeral --output-last-message <tmpfile> -
```

可以通过 `.env.local` 调整：

```bash
LUNARIS_AI_PROVIDER=auto
LUNARIS_CODEX_CLI=codex
LUNARIS_CODEX_MODEL=gpt-5.5
```

这对应 Lunaris 的实际架构：

- provider id: `openai-codex`
- auth method: `oauth`
- secret ref: `external:codex`
- runtime: `codex_cli`
- model refs: `openai/gpt-5.5` 这类引用会传给 `codex exec -m gpt-5.5`
- 连接状态通过 `codex login status` 判断
- 前端仍然只调用本地 `/api/ai/...`，不会接触 token

如果你只有 ChatGPT 订阅而没有 API key，在目标电脑上先安装并登录 Codex：

```bash
npm install -g @openai/codex
codex login
codex login status
```

`codex login status` 需要显示已登录。然后重启本项目：

```bash
npm run dev
```

如果页面仍显示占位分析，打开下面的本地诊断地址：

```text
http://127.0.0.1:8787/api/ai/diagnostics
```

需要看到：

```json
{
  "codex": {
    "connected": true
  }
}
```

Windows 上全局安装的 `codex` 通常是 `codex.cmd`，本项目会通过 Windows shell 启动它。如果诊断里 `connected` 仍是 `false`，可在 `.env.local` 指定完整路径，例如：

```env
LUNARIS_CODEX_CLI=C:\\Users\\你的用户名\\AppData\\Roaming\\npm\\codex.cmd
```

如果当前机器没有可用的 Lunaris Codex runtime，例如另一台 Windows 电脑，可以改用服务端 HTTP provider。把 key 放在 `.env.local`，不要放进浏览器或前端代码：

```bash
LUNARIS_AI_PROVIDER=auto
OPENAI_API_KEY=你的服务端 key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

也可以使用 Lunaris 兼容命名：

```bash
LUNARIS_AI_API_KEY=你的服务端 key
LUNARIS_AI_BASE_URL=https://api.openai.com/v1
LUNARIS_AI_MODEL=gpt-4o-mini
```

`LUNARIS_AI_PROVIDER=auto` 会先尝试 Codex CLI，失败后再尝试 HTTP provider。若想在 Windows 上跳过 Codex CLI，可以设置：

```bash
LUNARIS_AI_PROVIDER=http
```

如果当前机器没有可用的 Codex runtime，也没有配置 HTTP provider，接口会返回明确的本地占位反思，UI 会继续允许保存笔记。等 Lunaris 后续暴露稳定 HTTP provider route 时，把连接逻辑接到 `server/codexAnalysisService.js` 的 HTTP provider 配置即可。

## 运行

```bash
npm run dev
```

前端默认运行在：

```text
http://127.0.0.1:5173
```

后端 API 默认运行在：

```text
http://127.0.0.1:8787
```

## 使用方式

1. 在「当前股票」搜索股票代码或公司名称。
2. 添加股票，写下「今天为什么关注它？」和个人判断。
3. 选择股票查看价格走势。
4. 如果是持仓，记录数量、均价和买入日期。
5. 在右侧填写买卖前检查、止损价、判断失效条件和情绪状态。
6. 点击「让 AI 帮我检查这次决定」查看结构化思考辅助。
7. 在「问 AI」里围绕当前股票继续提问，帮助自己把思路写清楚。
8. 保存到「交易笔记」，后续补充 1 周后、1 个月后复盘。

## 本地数据

v1 使用 `localStorage` 保存：

- watchlist
- holdings
- journal entries
- UI preferences

本地存储逻辑集中在 `src/services/storageService.ts`，方便后续迁移到数据库。
