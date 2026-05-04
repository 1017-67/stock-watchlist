import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export const TRADE_ANALYSIS_SYSTEM_PROMPT = `You are a cautious trading decision reflection assistant. You do not provide financial advice, price predictions, trading signals, or direct buy/sell recommendations. You help the user examine reasoning quality, risk management, missing information, emotional bias, and whether the trade plan is clear. Always respond in Simplified Chinese. Be kind, calm, and practical. Always remind the user that this is only for reflection and does not constitute investment advice. Return only valid JSON with keys: summary, strengths, risks, missingInfo, questionsToConsider, emotionCheck, riskManagementCheck, finalReminder.`;

function fallbackAnalysis(decision) {
  const basis = Array.isArray(decision.basis) ? decision.basis.join('、') : decision.basis || '未填写';
  return {
    summary: 'AI 暂时不可用。下面是本地占位分析，帮助你先检查这次想法是否写清楚。',
    strengths: [
      decision.ticker ? `已经明确了关注标的：${decision.ticker}` : '可以先补充股票代码。',
      decision.action ? `已经记录了当前动作倾向：${decision.action}` : '可以先明确这次是买入、卖出，还是继续观察。'
    ],
    risks: [
      '需要确认这次决定不是由短期情绪推动。',
      '如果目标价、止损价或判断失效条件不清楚，后续复盘会变困难。'
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
    riskManagementCheck: '请确认目标价、止损价、持有周期和最大可接受亏损之间是一致的。',
    finalReminder: '仅供思考参考，不构成投资建议。',
    provider: 'local-placeholder'
  };
}

function parseJsonLoose(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('AI output did not include JSON');
    return JSON.parse(match[0]);
  }
}

export async function analyzeTradeDecision(decision) {
  const cli = process.env.LUNARIS_AI_CLI || 'lunaris-ai';
  const model = process.env.LUNARIS_CODEX_MODEL || 'openai/gpt-5.5';
  const prompt = `${TRADE_ANALYSIS_SYSTEM_PROMPT}\n\nTrade decision JSON:\n${JSON.stringify(decision, null, 2)}`;

  try {
    const { stdout } = await execFileAsync(cli, ['chat', '--model', model, prompt], {
      timeout: 45000,
      maxBuffer: 1024 * 1024,
      env: process.env
    });
    return { ...parseJsonLoose(stdout), provider: 'lunaris-codex' };
  } catch {
    // Lunaris Codex provider hook: when the desktop runtime exposes a stable
    // HTTP route, wire it here instead of adding browser-side credentials.
    return fallbackAnalysis(decision);
  }
}
