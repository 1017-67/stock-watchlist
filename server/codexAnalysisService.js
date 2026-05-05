import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const TRADE_ANALYSIS_SYSTEM_PROMPT = `You are a cautious trading decision reflection assistant. You do not provide financial advice, price predictions, trading signals, or direct buy/sell recommendations. You help the user examine reasoning quality, risk management, missing information, emotional bias, and whether the trade plan is clear. Always respond in Simplified Chinese. Be kind, calm, and practical. Always remind the user that this is only for reflection and does not constitute investment advice. Return only valid JSON with keys: summary, strengths, risks, missingInfo, questionsToConsider, emotionCheck, riskManagementCheck, finalReminder.`;

export const AI_CHAT_SYSTEM_PROMPT = `You are a cautious investment reflection chat assistant for an app named 投资笔记. You do not provide financial advice, price predictions, trading signals, direct buy/sell recommendations, or commands. You help the user clarify their own thinking, identify missing information, examine risk management, and separate facts from emotion. Always respond in Simplified Chinese. Be concise, warm, and practical. If the user asks whether to buy or sell, redirect to questions and risk checks instead of answering directly. End with a short reminder that this is only for reflection and does not constitute investment advice.`;

function fallbackAnalysis(decision) {
  const basis = Array.isArray(decision.basis) ? decision.basis.join('、') : decision.basis || '未填写';
  return {
    summary: 'Lunaris Codex 连接尚未启用。下面是本地占位分析，帮助你先检查这次想法是否写清楚。',
    strengths: [
      decision.ticker ? `已经明确了关注标的：${decision.ticker}` : '可以先补充股票代码。',
      decision.action ? `已经记录了当前动作倾向：${decision.action}` : '可以先明确这次是买入、卖出，还是继续观察。'
    ],
    risks: [
      '需要确认这次决定不是由短期情绪推动。',
      '如果止损价或判断失效条件不清楚，后续复盘会变困难。'
    ],
    missingInfo: [
      '可以补充关键财务、估值或业务变化依据。',
      `当前主要依据：${basis}。可以说明这些依据里最重要的一条是什么。`
    ],
    questionsToConsider: [
      '如果价格没有按计划发展，你准备在什么条件下重新检查判断？',
      '这次计划的最大亏损是否在可承受范围内？',
      '有没有相反证据值得先看一眼？'
    ],
    emotionCheck: decision.emotionalFlags?.length
      ? '你标记了情绪因素，建议先把情绪和事实分开写一遍。'
      : '目前没有明显标记情绪因素，但仍建议检查是否存在急于行动的压力。',
    riskManagementCheck: '请确认止损价、持有周期和最大可接受亏损之间是一致的。',
    finalReminder: '仅供思考参考，不构成投资建议。',
    provider: 'lunaris-codex-placeholder'
  };
}

function parseJsonLoose(text) {
  try {
    return JSON.parse(text);
  } catch {
    const end = text.lastIndexOf('}');
    if (end === -1) throw new Error('AI output did not include JSON');

    for (let start = text.lastIndexOf('{', end); start >= 0; start = text.lastIndexOf('{', start - 1)) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        // Keep looking for the start of the final JSON object in noisy CLI output.
      }
    }

    throw new Error('AI output did not include parseable JSON');
  }
}

function parseCodexJsonEvents(text) {
  try {
    return parseJsonLoose(text);
  } catch {
    // Newer Lunaris-style output-last-message returns plain text; JSONL output
    // from older Codex builds is handled below.
  }

  const lines = text.split('\n').filter(Boolean);
  for (const line of lines.reverse()) {
    try {
      const event = JSON.parse(line);
      if (event?.type === 'item.completed' && event.item?.type === 'agent_message' && event.item.text) {
        return parseJsonLoose(event.item.text);
      }
    } catch {
      // Non-JSON log lines are ignored.
    }
  }
  throw new Error('Codex JSON event output did not include an agent message');
}

function parseCodexTextEvents(text) {
  const lines = text.split('\n').filter(Boolean);
  for (const line of lines.reverse()) {
    try {
      const event = JSON.parse(line);
      if (event?.type === 'item.completed' && event.item?.type === 'agent_message' && event.item.text) {
        return event.item.text.trim();
      }
    } catch {
      // Non-JSON log lines are ignored.
    }
  }

  const trimmed = text.trim();
  if (trimmed) return trimmed;
  throw new Error('Codex output did not include an agent message');
}

function runCodexExec(cli, args, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(cli, args, {
      env: process.env,
      cwd: process.cwd(),
      shell: process.platform === 'win32',
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(stderr || `codex exec exited with ${code}`));
      }
    });

    child.stdin.end(input);
  });
}

async function codexLoginStatus(cli = process.env.LUNARIS_CODEX_CLI || 'codex') {
  try {
    const { stdout, stderr } = await runCodexExec(cli, ['login', 'status'], '');
    const output = `${stdout}\n${stderr}`.trim();
    return {
      connected: output.toLowerCase().includes('logged in'),
      message: output
    };
  } catch (error) {
    return {
      connected: false,
      message: error instanceof Error ? error.message : 'Codex login status unavailable'
    };
  }
}

export async function getAiDiagnostics() {
  const cli = process.env.LUNARIS_CODEX_CLI || 'codex';
  const codexStatus = await codexLoginStatus(cli);
  const httpProvider = resolveHttpProvider();
  return {
    providerMode: process.env.LUNARIS_AI_PROVIDER || 'auto',
    codex: {
      cli,
      connected: codexStatus.connected,
      message: codexStatus.message,
      windowsShellMode: process.platform === 'win32'
    },
    httpProvider: {
      configured: Boolean(httpProvider),
      baseUrl: httpProvider?.baseUrl || null,
      model: httpProvider?.model || null
    },
    selectedModel: process.env.LUNARIS_CODEX_MODEL || 'gpt-5.5'
  };
}

function resolveHttpProvider() {
  const apiKey = process.env.LUNARIS_AI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return undefined;

  return {
    apiKey,
    baseUrl: (process.env.LUNARIS_AI_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, ''),
    model: process.env.LUNARIS_AI_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini'
  };
}

export function getAiProviderStatus() {
  if (resolveHttpProvider()) return 'lunaris-http-or-openai';
  return 'lunaris-codex-or-placeholder';
}

async function runHttpChat(systemPrompt, userPrompt, options = {}) {
  const provider = resolveHttpProvider();
  if (!provider) throw new Error('No server-side HTTP AI provider configured');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.LUNARIS_AI_TIMEOUT_MS || 45000));

  try {
    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: provider.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        ...(options.json ? { response_format: { type: 'json_object' } } : {})
      }),
      signal: controller.signal
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error?.message || `HTTP AI provider returned ${response.status}`);
    }

    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('HTTP AI provider returned an empty message');
    return content.trim();
  } finally {
    clearTimeout(timeout);
  }
}

async function runCodexPrompt(prompt, parser) {
  const cli = process.env.LUNARIS_CODEX_CLI || 'codex';
  const modelRef = process.env.LUNARIS_CODEX_MODEL || 'gpt-5.5';
  const model = modelRef.replace(/^openai\//, '');
  const status = await codexLoginStatus(cli);
  if (!status.connected) {
    throw new Error(status.message || 'Codex is not signed in with ChatGPT');
  }
  const tempDir = await mkdtemp(join(tmpdir(), 'investnote-codex-'));
  const outputPath = join(tempDir, 'last-message.txt');

  // Same Lunaris direction: Codex is the server-side auth/runtime layer.
  // The browser only calls this local API route; it never receives tokens.
  try {
    const { stdout, stderr } = await runCodexExec(cli, [
      '-a',
      'never',
      'exec',
      '-m',
      model,
      '-s',
      'read-only',
      '--skip-git-repo-check',
      '--ephemeral',
      '--output-last-message',
      outputPath,
      '-'
    ], prompt);

    try {
      const text = (await readFile(outputPath, 'utf8')).trim();
      if (text) return parser(text);
    } catch {
      // Fall through to stdout/stderr parsing for older Codex builds.
    }

    return parser(`${stdout}\n${stderr}`);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

function shouldTryCodexFirst() {
  return (process.env.LUNARIS_AI_PROVIDER || 'auto').toLowerCase() !== 'http';
}

export async function analyzeTradeDecision(decision) {
  const userPrompt = `Trade decision JSON:\n${JSON.stringify(decision, null, 2)}`;
  const codexPrompt = `${TRADE_ANALYSIS_SYSTEM_PROMPT}\n\n${userPrompt}`;

  if (shouldTryCodexFirst()) {
    try {
      return { ...await runCodexPrompt(codexPrompt, parseCodexJsonEvents), provider: 'lunaris-codex' };
    } catch (error) {
      console.warn('[ai-analysis] Lunaris Codex bridge unavailable:', error instanceof Error ? error.message : error);
    }
  }

  try {
    const content = await runHttpChat(TRADE_ANALYSIS_SYSTEM_PROMPT, userPrompt, { json: true });
    return { ...parseJsonLoose(content), provider: 'lunaris-http' };
  } catch (error) {
    console.warn('[ai-analysis] HTTP AI provider fallback:', error instanceof Error ? error.message : error);
    return fallbackAnalysis(decision);
  }
}

function fallbackChatAnswer(message, context) {
  const symbol = context?.selectedStock?.symbol || context?.symbol || '当前标的';
  const userQuestion = String(message || '').trim();
  const directAdvicePattern = /(该不该|能买吗|能卖吗|买入|卖出|会涨|会跌|目标价|推荐|信号)/i;
  const opening = userQuestion
    ? `我会把这个问题当作思考整理来处理：${userQuestion}`
    : '可以先写下你想澄清的问题，我会帮你检查思路是否清楚。';

  if (directAdvicePattern.test(userQuestion)) {
    return `${opening}\n\n我不能替你判断是否买入、卖出或预测价格。你可以围绕 ${symbol} 先补充三件事：\n1. 这次关注它的核心依据是什么？\n2. 什么事实会说明原来的判断需要修正？\n3. 如果判断不成立，最大可接受亏损是多少？\n\n仅供思考参考，不构成投资建议。`;
  }

  return `${opening}\n\n可以从这几个角度继续拆开：\n1. 这是事实、假设，还是情绪感受？\n2. 还有哪些相反证据没有看？\n3. 风险控制是否已经写成可以执行、可以复盘的条件？\n\n仅供思考参考，不构成投资建议。`;
}

export async function askInvestmentQuestion(payload = {}) {
  const message = String(payload.message || '').trim();
  const context = payload.context || {};
  const userPrompt = `Current app context JSON:\n${JSON.stringify(context, null, 2)}\n\nUser question:\n${message}`;
  const codexPrompt = `${AI_CHAT_SYSTEM_PROMPT}\n\n${userPrompt}`;

  if (shouldTryCodexFirst()) {
    try {
      return {
        answer: await runCodexPrompt(codexPrompt, parseCodexTextEvents),
        provider: 'lunaris-codex'
      };
    } catch (error) {
      console.warn('[ai-chat] Lunaris Codex bridge unavailable:', error instanceof Error ? error.message : error);
    }
  }

  try {
    return {
      answer: await runHttpChat(AI_CHAT_SYSTEM_PROMPT, userPrompt),
      provider: 'lunaris-http'
    };
  } catch (error) {
    console.warn('[ai-chat] HTTP AI provider fallback:', error instanceof Error ? error.message : error);
    return {
      answer: fallbackChatAnswer(message, context),
      provider: 'lunaris-codex-placeholder'
    };
  }
}
