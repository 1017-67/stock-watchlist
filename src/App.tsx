import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from './components/AppShell';
import { HoldingsPanel } from './components/HoldingsPanel';
import { Journal } from './components/Journal';
import { StockDetailPanel } from './components/StockDetailPanel';
import { TradeDecisionForm } from './components/TradeDecisionForm';
import { Watchlist } from './components/Watchlist';
import { getPriceHistory, getQuote } from './services/marketDataService';
import { loadJournal, loadWatchlist, saveJournal, saveWatchlist } from './services/storageService';
import type { HistoryPoint, JournalEntry, PriceRange, WatchStock } from './types';

const MARKET_ERROR = '暂时无法获取实时行情，请稍后再试。';

export default function App() {
  const [stocks, setStocks] = useState<WatchStock[]>(() => loadWatchlist());
  const [journal, setJournal] = useState<JournalEntry[]>(() => loadJournal());
  const [selectedId, setSelectedId] = useState<string | undefined>(() => loadWatchlist()[0]?.id);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [range, setRange] = useState<PriceRange>('1M');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [chartError, setChartError] = useState('');
  const didInitialRefresh = useRef(false);

  const selectedStock = stocks.find((stock) => stock.id === selectedId);
  const holdings = useMemo(() => stocks.filter((stock) => stock.type === 'holding'), [stocks]);

  useEffect(() => {
    saveWatchlist(stocks);
  }, [stocks]);

  useEffect(() => {
    saveJournal(journal);
  }, [journal]);

  const refreshQuotes = useCallback(async (targets: WatchStock[]) => {
    const updated = await Promise.all(
      targets.map(async (stock) => {
        try {
          return { ...stock, quote: await getQuote(stock.symbol) };
        } catch {
          return stock;
        }
      })
    );
    setStocks((current) => current.map((stock) => updated.find((item) => item.id === stock.id) || stock));
  }, []);

  useEffect(() => {
    if (!didInitialRefresh.current && stocks.length) {
      didInitialRefresh.current = true;
      void refreshQuotes(stocks);
    }
  }, [refreshQuotes, stocks]);

  useEffect(() => {
    if (!selectedStock) {
      setHistory([]);
      return;
    }

    let cancelled = false;
    setLoadingHistory(true);
    setChartError('');
    getPriceHistory(selectedStock.symbol, range)
      .then((data) => {
        if (!cancelled) setHistory(data);
      })
      .catch(() => {
        if (!cancelled) {
          setHistory([]);
          setChartError(MARKET_ERROR);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedStock, range]);

  function addStock(stock: WatchStock) {
    setStocks((current) => [stock, ...current.filter((item) => item.symbol !== stock.symbol)]);
    setSelectedId(stock.id);
    void refreshQuotes([stock]);
  }

  function removeStock(id: string) {
    setStocks((current) => current.filter((stock) => stock.id !== id));
    if (selectedId === id) setSelectedId(undefined);
  }

  function saveEntry(entry: JournalEntry) {
    setJournal((current) => [entry, ...current]);
  }

  function updateEntry(entry: JournalEntry) {
    setJournal((current) => current.map((item) => (item.id === entry.id ? entry : item)));
  }

  return (
    <AppShell>
      <main className="main-grid">
        <div className="left-column">
          <Watchlist
            stocks={stocks}
            selectedId={selectedId}
            onAdd={addStock}
            onRemove={removeStock}
            onSelect={setSelectedId}
            onRefresh={() => void refreshQuotes(stocks)}
          />
          <HoldingsPanel holdings={holdings} />
        </div>
        <StockDetailPanel
          stock={selectedStock}
          history={history}
          range={range}
          loadingHistory={loadingHistory}
          chartError={chartError}
          onRangeChange={setRange}
          onRefresh={() => selectedStock && void refreshQuotes([selectedStock])}
          onRecord={(stock) => setSelectedId(stock.id)}
        />
      </main>
      <main className="lower-grid">
        <TradeDecisionForm selectedStock={selectedStock} onSave={saveEntry} />
        <Journal entries={journal} onUpdate={updateEntry} />
      </main>
    </AppShell>
  );
}
