import { PIcon } from "@porsche-design-system/components-react/ssr";
import * as Dialog from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import { useRouter } from "next/router";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";
import {
  type SpotlightAction,
  useSpotlightActions,
} from "@/hooks/useSpotlightActions";
import { getItems, getLabel, getRing, getSegment } from "@/lib/data";
import {
  extractSnippet,
  matchesAbbreviation,
  plainTextBodyFor,
  searchableTextFor,
} from "@/lib/format";
import { useRadarHighlight } from "@/lib/RadarHighlightContext";
import type { Item } from "@/lib/types";
import { cn } from "@/lib/utils";

import styles from "./SpotlightSearch.module.scss";

const HIGHLIGHT_DEBOUNCE_MS = 150;
const MAX_RESULTS = 30;
const MAX_SUGGESTIONS = 8;
const MAX_HOTKEYS = 9;
const MAX_VISIBLE_TAGS = 3;
const COMMAND_PREFIX = ">";
const COMMAND_PLACEHOLDER = "Run an action…";

export function SpotlightSearch() {
  const router = useRouter();
  const { setHighlight } = useRadarHighlight();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const items = useMemo<Item[]>(() => getItems(), []);
  const placeholder = getLabel("searchPlaceholder") || "Search";
  const longPlaceholder = getLabel("searchPlaceholderLong") || placeholder;

  const isCommandMode = query.startsWith(COMMAND_PREFIX);
  const commandQuery = isCommandMode
    ? query.slice(COMMAND_PREFIX.length).trim().toLowerCase()
    : "";

  const suggestions = useMemo<Item[]>(() => {
    const picked: Item[] = [];
    const seen = new Set<string>();
    for (const item of items) {
      if (picked.length >= MAX_SUGGESTIONS) break;
      if (item.featured && !seen.has(item.id)) {
        picked.push(item);
        seen.add(item.id);
      }
    }
    for (const item of items) {
      if (picked.length >= MAX_SUGGESTIONS) break;
      if (item.flag !== "default" && !seen.has(item.id)) {
        picked.push(item);
        seen.add(item.id);
      }
    }
    return picked;
  }, [items]);

  const results = useMemo<Item[]>(() => {
    if (isCommandMode) return [];
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const titleMatches: Item[] = [];
    const bodyMatches: Item[] = [];
    for (const item of items) {
      if (titleMatches.length + bodyMatches.length >= MAX_RESULTS) break;
      const titleLower = item.title.toLowerCase();
      const isTitleMatch =
        titleLower.includes(q) ||
        matchesAbbreviation(item.title, q) ||
        searchableTextFor(item).includes(q);
      if (isTitleMatch) {
        titleMatches.push(item);
        continue;
      }
      if (plainTextBodyFor(item).includes(q)) {
        bodyMatches.push(item);
      }
    }
    return [...titleMatches, ...bodyMatches].slice(0, MAX_RESULTS);
  }, [items, query, isCommandMode]);

  useEffect(() => {
    const ids = results.map((item) => item.id);
    const timer = setTimeout(() => {
      setHighlight(ids, ids.length > 0);
    }, HIGHLIGHT_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [results, setHighlight]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setHighlight([], false);
  }, [setHighlight]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (next) {
        setOpen(true);
      } else {
        close();
      }
    },
    [close],
  );

  useKeyboardShortcut({
    key: "k",
    meta: true,
    ctrl: true,
    onTrigger: useCallback(() => setOpen((prev) => !prev), []),
  });

  useEffect(() => {
    const onRouteChange = (_url: string, { shallow }: { shallow: boolean }) => {
      if (!shallow) close();
    };
    router.events.on("routeChangeStart", onRouteChange);
    return () => {
      router.events.off("routeChangeStart", onRouteChange);
    };
  }, [router.events, close]);

  const navigateToItem = useCallback(
    (item: Item) => {
      router.push(`/${item.segment}/${item.id}`).catch(() => {});
      close();
    },
    [router, close],
  );

  const trimmedQuery = isCommandMode ? "" : query.trim();
  const showSuggestions =
    !isCommandMode && !trimmedQuery && suggestions.length > 0;
  const visibleItems = trimmedQuery ? results : suggestions;

  const actions = useSpotlightActions(close);
  const filteredActions = useMemo<SpotlightAction[]>(() => {
    if (!isCommandMode) return [];
    if (!commandQuery) return actions;
    return actions.filter(
      (a) =>
        a.label.toLowerCase().includes(commandQuery) ||
        a.keywords?.some((k) => k.includes(commandQuery)),
    );
  }, [actions, isCommandMode, commandQuery]);

  useEffect(() => {
    if (!open || isCommandMode) return;
    const onDigit = (event: KeyboardEvent) => {
      if (!event.metaKey && !event.ctrlKey) return;
      const digit = Number.parseInt(event.key, 10);
      if (!Number.isInteger(digit) || digit < 1 || digit > MAX_HOTKEYS) return;
      const target = visibleItems[digit - 1];
      if (!target) return;
      event.preventDefault();
      navigateToItem(target);
    };
    document.addEventListener("keydown", onDigit);
    return () => document.removeEventListener("keydown", onDigit);
  }, [open, isCommandMode, visibleItems, navigateToItem]);

  const renderHighlightedText = (text: string): ReactNode => {
    const q = query.trim();
    if (!q) return text;
    const lower = text.toLowerCase();
    const lq = q.toLowerCase();
    const idx = lower.indexOf(lq);
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className={styles.matchHighlight}>
          {text.slice(idx, idx + q.length)}
        </mark>
        {text.slice(idx + q.length)}
      </>
    );
  };

  const renderItem = (item: Item, index: number): ReactNode => {
    const segment = getSegment(item.segment);
    const ring = getRing(item.ring);
    const hotkey = index < MAX_HOTKEYS ? index + 1 : null;
    const tags = item.tags?.slice(0, MAX_VISIBLE_TAGS) ?? [];
    const trimmed = query.trim();
    const titleLower = item.title.toLowerCase();
    const lq = trimmed.toLowerCase();
    const matchedInTitleOrMeta =
      !trimmed ||
      titleLower.includes(lq) ||
      matchesAbbreviation(item.title, trimmed) ||
      searchableTextFor(item).includes(lq);
    const bodySnippet =
      trimmed && !matchedInTitleOrMeta
        ? extractSnippet(plainTextBodyFor(item), trimmed)
        : null;
    return (
      <Command.Item
        key={item.id}
        value={item.id}
        onSelect={() => navigateToItem(item)}
        className={cn(styles.item)}
      >
        <span className={styles.itemRow}>
          <span className={styles.itemMain}>
            <span className={styles.itemTitle}>
              {renderHighlightedText(item.title)}
            </span>
            <span className={styles.itemMeta}>
              {segment?.title}
              {ring ? ` · ${ring.title}` : ""}
            </span>
          </span>
          <span className={styles.itemAside}>
            {tags.length > 0 && (
              <span className={styles.itemTags}>
                {tags.map((tag) => (
                  <span key={tag} className={styles.tag}>
                    {tag}
                  </span>
                ))}
              </span>
            )}
            {hotkey !== null && (
              <kbd className={styles.itemHotkey} aria-label={`Cmd+${hotkey}`}>
                ⌘{hotkey}
              </kbd>
            )}
          </span>
        </span>
        {bodySnippet ? (
          <span className={styles.itemSnippet}>
            {renderHighlightedText(bodySnippet)}
          </span>
        ) : (
          item.summary && (
            <span className={styles.itemSummary}>{item.summary}</span>
          )
        )}
      </Command.Item>
    );
  };

  return (
    <>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen(true)}
        aria-label={placeholder}
      >
        <PIcon name="search" size="small" aria-hidden="true" />
        <span className={styles.triggerLabel}>{placeholder}</span>
        <kbd className={styles.kbd}>⌘K</kbd>
      </button>

      <Command.Dialog
        open={open}
        onOpenChange={handleOpenChange}
        label={placeholder}
        shouldFilter={false}
        loop
        overlayClassName={styles.overlay}
        contentClassName={styles.content}
      >
        <Dialog.Title className={styles.srOnly}>{placeholder}</Dialog.Title>
        <Dialog.Description className={styles.srOnly}>
          Search the technology radar and jump to any item.
        </Dialog.Description>
        <div className={styles.inputWrapper}>
          <PIcon
            name="search"
            size="small"
            className={styles.searchIcon}
            aria-hidden="true"
          />
          {isCommandMode && <span className={styles.modeChip}>Actions</span>}
          <Command.Input
            value={query}
            onValueChange={setQuery}
            placeholder={isCommandMode ? COMMAND_PLACEHOLDER : longPlaceholder}
            className={styles.input}
          />
        </div>

        <Command.List className={styles.list}>
          {isCommandMode ? (
            <>
              {filteredActions.length === 0 && (
                <Command.Empty className={styles.empty}>
                  No matching actions.
                </Command.Empty>
              )}
              {filteredActions.length > 0 && (
                <Command.Group heading="Actions" className={styles.group}>
                  {filteredActions.map((action) => (
                    <Command.Item
                      key={action.id}
                      value={action.id}
                      onSelect={() => action.perform()}
                      className={cn(styles.item)}
                    >
                      <span className={styles.itemRow}>
                        <span className={styles.itemMain}>
                          <span className={styles.itemTitle}>
                            {action.label}
                          </span>
                          {action.hint && (
                            <span className={styles.itemMeta}>
                              {action.hint}
                            </span>
                          )}
                        </span>
                      </span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
            </>
          ) : (
            <>
              {trimmedQuery && results.length === 0 && (
                <Command.Empty className={styles.empty}>
                  No results found.
                </Command.Empty>
              )}
              {showSuggestions && (
                <Command.Group heading="Latest" className={styles.group}>
                  {suggestions.map(renderItem)}
                </Command.Group>
              )}
              {trimmedQuery && results.map(renderItem)}
            </>
          )}
        </Command.List>

        <div className={styles.footer}>
          <span>
            <kbd className={styles.kbdSmall}>↑</kbd>
            <kbd className={styles.kbdSmall}>↓</kbd>
            Navigate
          </span>
          <span>
            <kbd className={styles.kbdSmall}>↵</kbd>
            {isCommandMode ? "Run" : "Open"}
          </span>
          <span>
            <kbd className={styles.kbdSmall}>{COMMAND_PREFIX}</kbd>
            Actions
          </span>
          <span>
            <kbd className={styles.kbdSmall}>Esc</kbd>
            Close
          </span>
        </div>
      </Command.Dialog>
    </>
  );
}
