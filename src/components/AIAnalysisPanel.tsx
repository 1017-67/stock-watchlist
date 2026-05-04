import type { AIAnalysis } from '../types';

export function AIAnalysisPanel({ analysis, error }: { analysis?: AIAnalysis; error?: string }) {
  if (error) {
    return <div className="soft-error">{error}</div>;
  }

  if (!analysis) {
    return (
      <div className="ai-placeholder">
        AI 思考辅助会检查推理质量、风险管理、缺少的信息和情绪偏差。
      </div>
    );
  }

  return (
    <div className="ai-panel">
      <section>
        <h3>总结</h3>
        <p>{analysis.summary}</p>
      </section>
      <section>
        <h3>做得好的地方</h3>
        <ul>{analysis.strengths.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>
      <section>
        <h3>主要风险</h3>
        <ul>{analysis.risks.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>
      <section>
        <h3>还缺少的信息</h3>
        <ul>{analysis.missingInfo.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>
      <section>
        <h3>值得再想一想的问题</h3>
        <ul>{analysis.questionsToConsider.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>
      <section>
        <h3>情绪检查</h3>
        <p>{analysis.emotionCheck}</p>
      </section>
      <section>
        <h3>风险管理检查</h3>
        <p>{analysis.riskManagementCheck}</p>
      </section>
      <p className="final-reminder">{analysis.finalReminder}</p>
    </div>
  );
}
