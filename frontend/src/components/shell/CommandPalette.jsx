import { useEffect, useMemo, useRef, useState } from 'react';
import './shell.css';

/**
 * The command palette.
 *
 * It searches the workspace's own navigation and the Reels that the API
 * actually returned - never a made-up list. The Reel search is supplied by
 * the caller so the palette never has to fetch on its own.
 */
export default function CommandPalette({
  open,
  onClose,
  onNavigate,
  sections = [],
  reels = [],
}) {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setCursor(0);
      // The focus has to land in the field, or the palette is unusable.
      const timer = window.setTimeout(() => inputRef.current?.focus(), 40);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [open]);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const nav = sections.flatMap((section) =>
      section.items.map((item) => ({
        kind: 'Page',
        label: item.label,
        hint: section.label,
        to: item.to,
      }))
    );
    const reelResults = reels.map((reel) => ({
      kind: 'Reel',
      label: reel.title,
      hint: reel.status,
      to: `/editor/${reel.id}`,
    }));

    const all = [...nav, ...reelResults];
    if (!needle) return all.slice(0, 12);
    return all
      .filter(
        (item) =>
          item.label.toLowerCase().includes(needle) ||
          (item.hint || '').toLowerCase().includes(needle)
      )
      .slice(0, 12);
  }, [query, sections, reels]);

  useEffect(() => {
    setCursor((value) => (value < results.length ? value : 0));
  }, [results.length]);

  if (!open) return null;

  const onKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setCursor((value) => (value + 1) % Math.max(1, results.length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setCursor(
        (value) => (value - 1 + results.length) % Math.max(1, results.length)
      );
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const picked = results[cursor];
      if (picked) onNavigate(picked.to);
    }
  };

  return (
    <div
      className="palette-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="palette" onKeyDown={onKeyDown}>
        <div className="palette-input-row">
          <input
            ref={inputRef}
            className="palette-input"
            placeholder="Search the pages and the Reels…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search"
            aria-controls="palette-results"
          />
          <kbd className="shell-kbd">Esc</kbd>
        </div>

        <ul className="palette-results" id="palette-results" ref={listRef} role="listbox">
          {results.length === 0 && (
            <li className="palette-empty">
              Nothing matches “{query}”. Try a page name or a Reel title.
            </li>
          )}
          {results.map((item, index) => (
            <li
              key={`${item.kind}-${item.label}-${index}`}
              className={`palette-result${index === cursor ? ' is-cursor' : ''}`}
              role="option"
              aria-selected={index === cursor}
              onMouseEnter={() => setCursor(index)}
              onClick={() => onNavigate(item.to)}
            >
              <span className="palette-kind">{item.kind}</span>
              <span className="palette-label truncate">{item.label}</span>
              <span className="palette-hint truncate">{item.hint}</span>
            </li>
          ))}
        </ul>

        <p className="palette-foot">
          <kbd className="shell-kbd">↑</kbd> <kbd className="shell-kbd">↓</kbd> to move,
          <kbd className="shell-kbd">Enter</kbd> to open, <kbd className="shell-kbd">Esc</kbd> to
          close.
        </p>
      </div>
    </div>
  );
}
