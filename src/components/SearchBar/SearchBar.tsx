import { PIcon } from "@porsche-design-system/components-react/ssr";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getItems, getLabel, getRing, getSegment } from "@/lib/data";
import { matchesAbbreviation } from "@/lib/format";
import { useRadarHighlight } from "@/lib/RadarHighlightContext";
import type { Item } from "@/lib/types";
import styles from "./SearchBar.module.scss";

const MAX_VISIBLE = 5;

export function SearchBar() {
  const router = useRouter();
  const { setHighlight } = useRadarHighlight();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const highlightMatch = useCallback(
    (text: string, query: string): ReactNode => {
      if (!query.trim()) return text;

      const q = query.toLowerCase();
      const substringIdx = text.toLowerCase().indexOf(q);
      if (substringIdx !== -1) {
        const before = text.slice(0, substringIdx);
        const match = text.slice(substringIdx, substringIdx + query.length);
        const after = text.slice(substringIdx + query.length);
        return (
          <>
            {before}
            <span className={styles.matchHighlight}>{match}</span>
            {after}
          </>
        );
      }

      if (matchesAbbreviation(text, q)) {
        const words = text.split(/(?<=[\s\-/&.]+)/);
        let qi = 0;
        return words.map((word, i) => {
          if (qi < q.length && word[0]?.toLowerCase() === q[qi]) {
            qi++;
            return (
              // biome-ignore lint/suspicious/noArrayIndexKey: ephemeral highlight fragments regenerated on each keystroke
              <span key={i}>
                <span className={styles.matchHighlight}>{word[0]}</span>
                {word.slice(1)}
              </span>
            );
          }
          // biome-ignore lint/suspicious/noArrayIndexKey: ephemeral highlight fragments regenerated on each keystroke
          return <span key={i}>{word}</span>;
        });
      }

      return text;
    },
    [],
  );

  const items = useMemo(() => getItems(), []);

  const allResults = useMemo<Item[]>(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        matchesAbbreviation(item.title, q),
    );
  }, [query, items]);

  const results = allResults.slice(0, MAX_VISIBLE);
  const overflowCount = allResults.length - results.length;

  useEffect(() => {
    const ids = allResults.map((item) => item.id);
    const timerId = setTimeout(() => {
      setHighlight(ids, ids.length > 0);
    }, 150);
    return () => clearTimeout(timerId);
  }, [allResults, setHighlight]);

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setIsOpen(true);
    setActiveIndex(-1);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setActiveIndex(-1);
    setHighlight([], false);
  }, [setHighlight]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen || results.length === 0) {
        if (e.key === "Escape") {
          close();
          inputRef.current?.blur();
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
          break;
        case "Enter":
          e.preventDefault();
          if (activeIndex >= 0 && activeIndex < results.length) {
            const item = results[activeIndex];
            router.push(`/${item.segment}/${item.id}`);
            close();
            setQuery("");
            inputRef.current?.blur();
          }
          break;
        case "Escape":
          close();
          inputRef.current?.blur();
          break;
      }
    },
    [isOpen, results, activeIndex, router, close],
  );

  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const el = listRef.current.children[activeIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      // Only react when the search dropdown is actually open. Otherwise an
      // unrelated click (e.g. a radar wedge) would invoke close(), which
      // resets the radar highlight via setHighlight([], false) and wipes a
      // highlight set moments earlier by another component.
      if (!isOpen) return;
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        // Don't clear highlights when clicking a radar tooltip/blip link —
        // removing highlights would delete the <Link> from the DOM before navigation fires.
        const target = e.target as Element | null;
        if (target?.closest("a[data-item-id]")) return;
        close();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [close, isOpen]);

  useEffect(() => {
    // Reset only the search UI on route change. Do NOT call close() here:
    // close() resets the radar highlight via setHighlight([], false), which
    // would wipe a highlight set by another component (e.g. a wedge click)
    // moments before navigation, causing a visible "all blips equal" flash
    // on the homepage and a reset mini-radar on the destination page.
    const handleRouteChange = () => {
      setIsOpen(false);
      setActiveIndex(-1);
      setQuery("");
      inputRef.current?.blur();
    };
    router.events.on("routeChangeStart", handleRouteChange);
    return () => router.events.off("routeChangeStart", handleRouteChange);
  }, [router.events]);

  const searchPlaceholder = getLabel("searchPlaceholder");

  return (
    <div className={styles.searchBar} ref={containerRef}>
      <div className={styles.inputWrapper}>
        <PIcon name="search" className={styles.searchIcon} size="small" />
        <input
          ref={inputRef}
          type="search"
          className={styles.input}
          placeholder={searchPlaceholder}
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim() && setIsOpen(true)}
          role="combobox"
          aria-expanded={isOpen && allResults.length > 0}
          aria-controls="search-results"
          aria-activedescendant={
            activeIndex >= 0 ? `search-result-${activeIndex}` : undefined
          }
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            className={styles.clearButton}
            onClick={() => {
              setQuery("");
              close();
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
          >
            <PIcon name="close" size="small" />
          </button>
        )}
      </div>

      {isOpen && allResults.length > 0 && (
        <div
          id="search-results"
          ref={listRef}
          role="listbox"
          tabIndex={-1}
          className={styles.dropdown}
          onMouseDown={(e) => e.preventDefault()}
        >
          {results.map((item, index) => {
            const segment = getSegment(item.segment);
            const ring = getRing(item.ring);
            return (
              <div
                key={item.id}
                id={`search-result-${index}`}
                role="option"
                tabIndex={-1}
                aria-selected={index === activeIndex}
                className={
                  index === activeIndex
                    ? `${styles.result} ${styles.active}`
                    : styles.result
                }
              >
                <Link
                  href={`/${item.segment}/${item.id}`}
                  className={styles.resultLink}
                  onClick={() => {
                    close();
                    setQuery("");
                    inputRef.current?.blur();
                  }}
                  tabIndex={-1}
                >
                  <span className={styles.resultTitle}>
                    {highlightMatch(item.title, query)}
                  </span>
                  <span className={styles.resultMeta}>
                    {segment?.title}
                    {ring ? ` · ${ring.title}` : ""}
                  </span>
                </Link>
              </div>
            );
          })}
          {overflowCount > 0 && (
            <div className={styles.overflow} aria-hidden="true">
              +{overflowCount} more result{overflowCount !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
