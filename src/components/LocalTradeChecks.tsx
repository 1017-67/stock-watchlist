import type { LocalCheckResult } from '../types';

export function LocalTradeChecks({ result }: { result: LocalCheckResult }) {
  return (
    <div className="checks">
      <div className="checks-title">
        <strong>{result.status === 'good' ? '计划比较清晰' : '还需要补充'}</strong>
        {result.rewardRisk !== undefined && <span>风险收益比 {result.rewardRisk.toFixed(2)}</span>}
      </div>
      <div className="check-list">
        {result.items.map((item, index) => (
          <div key={`${item.label}-${index}`} className={`check-item ${item.level}`}>
            <span>{item.label}</span>
            {item.detail && <small>{item.detail}</small>}
          </div>
        ))}
      </div>
    </div>
  );
}
