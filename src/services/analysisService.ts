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
  const target = numberValue(decision.targetPrice);
  const stopLoss = numberValue(decision.stopLoss);

  if (chineseLength(decision.reason) >= 30) {
    items.push({ label: '计划比较清晰', level: 'ok' });
  } else {
    items.push({ label: '还需要补充', level: 'warn', detail: '为什么现在要这样做，建议写到至少 30 个字。' });
  }

  if (target !== undefined && stopLoss !== undefined) {
    items.push({ label: '目标价和止损价已填写', level: 'ok' });
  } else {
    items.push({ label: '还需要补充', level: 'warn', detail: '目标价和止损价都需要填写。' });
  }

  if (decision.invalidation.trim()) {
    items.push({ label: '判断失效条件已记录', level: 'ok' });
  } else {
    items.push({ label: '缺少判断失效条件', level: 'warn' });
  }

  if (decision.action === '买入' && entry !== undefined && target !== undefined && stopLoss !== undefined) {
    if (target > entry && stopLoss < entry) {
      items.push({ label: '买入价格计划方向一致', level: 'ok' });
    } else {
      items.push({ label: '还需要补充', level: 'warn', detail: '买入计划里，目标价通常应高于计划价格，止损价应低于计划价格。' });
    }
  }

  if (decision.action === '卖出' && !decision.sellReason) {
    items.push({ label: '还需要补充', level: 'warn', detail: '卖出前先区分：判断失效、目标达成、再平衡，还是情绪影响。' });
  }

  let rewardRisk: number | undefined;
  if (entry !== undefined && target !== undefined && stopLoss !== undefined) {
    const upside = target - entry;
    const downside = entry - stopLoss;
    if (downside > 0) {
      rewardRisk = upside / downside;
      if (rewardRisk >= 1.5) {
        items.push({ label: '风险收益比看起来较清楚', level: 'ok', detail: rewardRisk.toFixed(2) });
      } else {
        items.push({ label: '风险收益比偏弱', level: 'warn', detail: rewardRisk.toFixed(2) });
      }
    }
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
    items,
    rewardRisk
  };
}
