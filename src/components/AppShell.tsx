import type { ReactNode } from 'react';

export type AppTab = 'current' | 'journal';

const tabs: Array<{ id: AppTab; label: string }> = [
  { id: 'current', label: '当前股票' },
  { id: 'journal', label: '交易笔记' }
];

export function AppShell({
  activeTab,
  onTabChange,
  children
}: {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  children: ReactNode;
}) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">✎</div>
          <div>
            <h1>投资笔记</h1>
            <p>记录想法、检查风险、帮助复盘</p>
          </div>
        </div>
        <div className="safety-line">仅供思考参考，不构成投资建议。</div>
      </header>
      <nav className="app-tabs" aria-label="主导航">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={activeTab === tab.id ? 'active' : ''}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      {children}
      <footer>本工具只用于整理想法和复盘，不提供投资建议。投资有风险，决策需谨慎。</footer>
    </div>
  );
}
