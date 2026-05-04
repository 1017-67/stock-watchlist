import type { JournalEntry, WatchStock } from '../types';

const keys = {
  watchlist: 'investment-notes.watchlist',
  holdings: 'investment-notes.holdings',
  journal: 'investment-notes.journal',
  preferences: 'investment-notes.preferences'
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadWatchlist() {
  return readJson<WatchStock[]>(keys.watchlist, []);
}

export function saveWatchlist(items: WatchStock[]) {
  writeJson(keys.watchlist, items);
}

export function loadHoldings() {
  return loadWatchlist().filter((stock) => stock.type === 'holding');
}

export function saveHoldings(holdings: WatchStock[]) {
  const others = loadWatchlist().filter((stock) => stock.type !== 'holding');
  saveWatchlist([...others, ...holdings]);
}

export function loadJournal() {
  return readJson<JournalEntry[]>(keys.journal, []);
}

export function saveJournal(entries: JournalEntry[]) {
  writeJson(keys.journal, entries);
}

export function loadPreferences<T>(fallback: T) {
  return readJson<T>(keys.preferences, fallback);
}

export function savePreferences<T>(preferences: T) {
  writeJson(keys.preferences, preferences);
}
