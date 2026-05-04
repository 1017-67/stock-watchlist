import type { LocalCheckResult, TradeDecision } from '../types';

function numberValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function chineseLength(value: string) {
  return value.replace(/\s/g, '').length;
}

export function runLocalTradeChecks(decision: TradeDecision): LocalCheckResult {
  const items: LocalCheckResult['items'] = [];
  const entry = numberValue(decision.plannedPrice || decision.currentPrice);
  const stopLoss = numberValue(decision.stopLoss);

  if (chineseLength(decision.reason) >= 30) {
    items.push({ label: '计划比较清晰', level: 'ok' });
  } else {
    items.push({ label: '还需要补充', level: 'warn', detail: '为什么现在要这样做，建议写到至少 30 个字。' });
  }

  if (stopLoss !== undefined) {
    items.push({ label: '止损价已填写', level: 'ok' });
  } else {
    items.push({ label: '还需要补充', level: 'warn', detail: '止损价需要填写。' });
  }

  if (decision.invalidation.trim()) {
    items.push({ label: '判断失效条件已记录', level: 'ok' });
  } else {
    items.push({ label: '缺少判断失效条件', level: 'warn' });
  }

  if (decision.action === '买入' && entry !== undefined && stopLoss !== undefined) {
    if (stopLoss < entry) {
      items.push({ label: '止损价低于计划价格', level: 'ok' });
    } else {
      items.push({ label: '还需要补充', level: 'warn', detail: '买入计划里，止损价应低于计划价格。' });
    }
  }

  if (decision.action === '卖出' && !decision.sellReason) {
    items.push({ label: '还需要补充', level: 'warn', detail: '卖出前先区分：判断失效、目标达成、再平衡，还是情绪影响。' });
  }

  const emotionalWords = ['怕', '慌', '冲动', '别人', '错过', '马上', '暴涨', '急'];
  const soundsEmotional = emotionalWords.some((word) => decision.reason.includes(word));
  if (soundsEmotional || decision.emotionalFlags.length > 0) {
    items.push({ label: '理由可能过于情绪化', level: 'warn' });
  }

  if (decision.confidence === '高' && chineseLength(decision.reason) < 50) {
    items.push({ label: '信心较高，但理由还不够充分', level: 'warn' });
  }

  return {
    status: items.some((item) => item.level === 'warn') ? 'needs-work' : 'good',
    items
  };
}
