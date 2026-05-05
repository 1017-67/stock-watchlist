import { Bot, Send } from 'lucide-react';
import { useMemo, useState } from 'react';
import { askAiQuestion } from '../services/aiAnalysisService';
import type { HistoryPoint, WatchStock } from '../types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

interface Props {
  selectedStock?: WatchStock;
  history: HistoryPoint[];
}

function compactStockContext(stock?: WatchStock) {
  if (!stock) return undefined;
  return {
    symbol: stock.symbol,
    companyName: stock.companyName,
    type: stock.type,
    reason: stock.reason,
    thesis: stock.thesis,
    notes: stock.notes,
    quote: stock.quote
  };
}

export function AIChatBox({ selectedStock, history }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const context = useMemo(
    () => ({
      selectedStock: compactStockContext(selectedStock),
      recentHistory: history.slice(-8)
    }),
    [history, selectedStock]
  );

  async function sendQuestion() {
    const message = draft.trim();
    if (!message || loading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: message
    };

    setMessages((current) => [...current, userMessage]);
    setDraft('');
    setError('');
    setLoading(true);

    try {
      const answer = await askAiQuestion(message, context);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: answer
        }
      ]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'AI 暂时不可用，但你仍然可以继续记录自己的想法。');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel ai-chat-panel">
      <div className="section-header compact">
        <div>
          <h2>问 AI</h2>
          <p>围绕当前股票和你的笔记提问。</p>
        </div>
        <Bot size={18} aria-hidden="true" />
      </div>

      <div className="chat-thread" aria-live="polite">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <p>可以问：这段判断还缺什么信息？</p>
            <span>AI 只帮你梳理思路，不替你做决定。</span>
          </div>
        ) : (
          messages.map((message) => (
            <article key={message.id} className={`chat-message ${message.role}`}>
              {message.text.split('\n').map((line, index) => (
                <p key={`${message.id}-${index}`}>{line}</p>
              ))}
            </article>
          ))
        )}
        {loading && <div className="chat-status">正在整理思路…</div>}
        {error && <div className="soft-error chat-error">{error}</div>}
      </div>

      <div className="chat-composer">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="问一个想澄清的问题…"
          rows={3}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              void sendQuestion();
            }
          }}
        />
        <button type="button" className="primary-button" onClick={() => void sendQuestion()} disabled={loading || !draft.trim()}>
          <Send size={15} />发送
        </button>
      </div>

      <p className="chat-reminder">仅供思考参考，不构成投资建议。</p>
    </section>
  );
}
