import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { searchSymbols } from '../services/marketDataService';

interface Props {
  onPick: (stock: { symbol: string; companyName: string }) => void;
}

export function StockSearch({ onPick }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ symbol: string; description: string }>>([]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setStatus('');
      return;
    }

    const timer = window.setTimeout(async () => {
      setStatus('搜索中…');
      try {
        const found = await searchSymbols(trimmed);
        setResults(found);
        setStatus(found.length ? '' : '没有找到匹配结果。');
      } catch (error) {
        setResults([]);
        setStatus(error instanceof Error ? error.message : '暂时无法获取实时行情，请稍后再试。');
      }
    }, 450);

    return () => window.clearTimeout(timer);
  }, [query]);

  return (
    <div className="search-box">
      <div className="input-with-icon">
        <Search size={17} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索股票代码或公司名称…"
        />
      </div>
      {(results.length > 0 || status) && (
        <div className="search-results">
          {status && <div className="search-status">{status}</div>}
          {results.map((result) => (
            <button
              key={result.symbol}
              type="button"
              onClick={() => {
                onPick({ symbol: result.symbol, companyName: result.description });
                setQuery('');
                setResults([]);
              }}
            >
              <strong>{result.symbol}</strong>
              <span>{result.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
