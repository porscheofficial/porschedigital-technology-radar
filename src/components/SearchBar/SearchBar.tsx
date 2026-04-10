import Link from "next/link";
import { useRouter } from "next/router";
import {
  ChangeEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ReactNode } from "react";

import styles from "./SearchBar.module.scss";

import { useRadarHighlight } from "@/lib/RadarHighlightContext";
import { getItems, getLabel, getQuadrant, getRing } from "@/lib/data";
import { Item } from "@/lib/types";
import { PIcon } from "@porsche-design-system/components-react/ssr";

const MAX_VISIBLE = 5;

function highlightMatch(text: string, query: string): ReactNode {
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
    const words = text.split(/(?<=[\s\-\/&.]+)/);
    let qi = 0;
    return words.map((word, i) => {
      if (qi < q.length && word[0]?.toLowerCase() === q[qi]) {
        qi++;
        return (
          <span key={i}>
            <span className={styles.matchHighlight}>{word[0]}</span>
            {word.slice(1)}
          </span>
        );
      }
      return <span key={i}>{word}</span>;
    });
  }

  return text;
}

function matchesAbbreviation(title: string, query: string): boolean {
  const initials = title
    .split(/[\s\-\/&.]+/)
    .filter(Boolean)
    .map((word) => word[0].toLowerCase())
    .join("");
  return initials.startsWith(query.toLowerCase());
}

export function SearchBar() {
  const router = useRouter();
  const { setHighlight } = useRadarHighlight();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

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
    setHighlight(ids, ids.length > 0);
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
            router.push(`/${item.quadrant}/${item.id}`);
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
  }, [close]);

  useEffect(() => {
    const handleRouteChange = () => {
      close();
      setQuery("");
    };
    router.events.on("routeChangeStart", handleRouteChange);
    return () => router.events.off("routeChangeStart", handleRouteChange);
  }, [router.events, close]);

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
        <ul
          id="search-results"
          ref={listRef}
          className={styles.dropdown}
          role="listbox"
        >
          {results.map((item, index) => {
            const quadrant = getQuadrant(item.quadrant);
            const ring = getRing(item.ring);
            return (
              <li
                key={item.id}
                id={`search-result-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                className={
                  index === activeIndex
                    ? `${styles.result} ${styles.active}`
                    : styles.result
                }
              >
                <Link
                  href={`/${item.quadrant}/${item.id}`}
                  className={styles.resultLink}
                  onClick={() => {
                    close();
                    setQuery("");
                  }}
                  tabIndex={-1}
                >
                  <span className={styles.resultTitle}>
                    {highlightMatch(item.title, query)}
                  </span>
                  <span className={styles.resultMeta}>
                    {quadrant?.title}
                    {ring ? ` \u00b7 ${ring.title}` : ""}
                  </span>
                </Link>
              </li>
            );
          })}
          {overflowCount > 0 && (
            <li className={styles.overflow} aria-hidden="true">
              +{overflowCount} more result{overflowCount !== 1 ? "s" : ""}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
