import { useCallback, useEffect, useRef, useState } from 'react';
import { AppShell, type AppTab } from './components/AppShell';
import { Journal } from './components/Journal';
import { StockDetailPanel } from './components/StockDetailPanel';
import { TradeDecisionForm } from './components/TradeDecisionForm';
import { Watchlist } from './components/Watchlist';
import { getPriceHistory, getQuote } from './services/marketDataService';
import { loadJournal, loadWatchlist, saveJournal, saveWatchlist } from './services/storageService';
import type { HistoryPoint, JournalEntry, PriceRange, Quote, WatchStock } from './types';

const MARKET_ERROR = '暂时无法获取实时行情，请稍后再试。';

function quoteFromHistory(stock: WatchStock, data: HistoryPoint[]): Quote | undefined {
  const last = data.at(-1);
  if (!last?.price) return stock.quote;

  const previousClose = stock.quote?.previousClose;
  const change = previousClose ? last.price - previousClose : stock.quote?.change ?? 0;
  const changePercent = previousClose ? (change / previousClose) * 100 : stock.quote?.changePercent ?? 0;

  return {
    symbol: stock.symbol,
    currency: last.currency || stock.quote?.currency,
    currentPrice: last.price,
    change,
    changePercent,
    previousClose,
    high: stock.quote?.high,
    low: stock.quote?.low,
    open: stock.quote?.open,
    timestamp: Date.now(),
    source: stock.quote?.source || 'history'
  };
}

export default function App() {
  const [stocks, setStocks] = useState<WatchStock[]>(() => loadWatchlist());
  const [journal, setJournal] = useState<JournalEntry[]>(() => loadJournal());
  const [selectedId, setSelectedId] = useState<string | undefined>(() => loadWatchlist()[0]?.id);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [range, setRange] = useState<PriceRange>('1D');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [chartError, setChartError] = useState('');
  const [activeTab, setActiveTab] = useState<AppTab>('current');
  const didInitialRefresh = useRef(false);

  const selectedStock = stocks.find((stock) => stock.id === selectedId);
  const selectedStockId = selectedStock?.id;
  const selectedStockSymbol = selectedStock?.symbol;

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

  const loadHistory = useCallback(async (stock: WatchStock | undefined, requestedRange: PriceRange) => {
    if (!stock) {
      setHistory([]);
      return;
    }

    setLoadingHistory(true);
    setChartError('');
    return getPriceHistory(stock.symbol, requestedRange)
      .then((data) => {
        setHistory(data);
        const lastPrice = data.at(-1)?.price;
        if (requestedRange === '1D' && lastPrice) {
          setStocks((current) =>
            current.map((item) =>
              item.id === stock.id
                ? {
                    ...item,
                    quote: quoteFromHistory(item, data)
                  }
                : item
            )
          );
        }
      })
      .catch(() => {
        setHistory([]);
        setChartError(MARKET_ERROR);
      })
      .finally(() => {
        setLoadingHistory(false);
      });
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!selectedStockId || !selectedStockSymbol) {
      setHistory([]);
      return;
    }

    setLoadingHistory(true);
    setChartError('');
    getPriceHistory(selectedStockSymbol, range)
      .then((data) => {
        if (!cancelled) {
          setHistory(data);
          const lastPrice = data.at(-1)?.price;
          if (range === '1D' && lastPrice) {
            setStocks((current) =>
              current.map((item) =>
                item.id === selectedStockId
                  ? {
                      ...item,
                      quote: quoteFromHistory(item, data)
                    }
                  : item
              )
            );
          }
        }
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
  }, [selectedStockId, selectedStockSymbol, range]);

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
    <AppShell activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'current' && (
        <main className="workspace-grid">
          <Watchlist
            stocks={stocks}
            selectedId={selectedId}
            onAdd={addStock}
            onRemove={removeStock}
            onSelect={setSelectedId}
            onRefresh={() => void refreshQuotes(stocks)}
          />
          <StockDetailPanel
            stock={selectedStock}
            history={history}
            range={range}
            loadingHistory={loadingHistory}
            chartError={chartError}
            onRangeChange={setRange}
            onRetryHistory={() => void loadHistory(selectedStock, range)}
            onRefresh={() => {
              if (selectedStock) {
                void refreshQuotes([selectedStock]);
                void loadHistory(selectedStock, range);
              }
            }}
            onRecord={(stock) => {
              setSelectedId(stock.id);
            }}
          />
          <TradeDecisionForm selectedStock={selectedStock} onSave={saveEntry} />
        </main>
      )}

      {activeTab === 'journal' && (
        <main className="journal-grid">
          <Journal entries={journal} onUpdate={updateEntry} />
        </main>
      )}
    </AppShell>
  );
}
