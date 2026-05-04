import type { ReactNode } from 'react';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>投资笔记</h1>
          <p>记录想法、检查风险、帮助复盘</p>
        </div>
        <div className="safety-line">仅供思考参考，不构成投资建议。</div>
      </header>
      {children}
      <footer>本工具只用于整理想法和复盘，不提供投资建议。投资有风险，决策需谨慎。</footer>
    </div>
  );
}
