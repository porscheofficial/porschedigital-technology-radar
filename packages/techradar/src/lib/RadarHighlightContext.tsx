import { useRouter } from "next/router";
import {
  createContext,
  type FC,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";

import { getItems, getToggle } from "@/lib/data";
import type { Item } from "@/lib/types";

const emptySet: ReadonlySet<string> = new Set();
const multiSelect = getToggle("multiSelectFilters");

function toggleValue(
  set: ReadonlySet<string>,
  value: string,
): ReadonlySet<string> {
  if (multiSelect) {
    const next = new Set(set);
    if (next.has(value)) {
      next.delete(value);
    } else {
      next.add(value);
    }
    return next;
  }
  return set.has(value) ? emptySet : new Set([value]);
}

interface HighlightState {
  directIds: string[];
  directActive: boolean;
  suppressTooltips: boolean;
  activeFlags: ReadonlySet<string>;
  activeTags: ReadonlySet<string>;
  activeTeams: ReadonlySet<string>;
}

const initialState: HighlightState = {
  directIds: [],
  directActive: false,
  suppressTooltips: false,
  activeFlags: emptySet,
  activeTags: emptySet,
  activeTeams: emptySet,
};

type Action =
  | { type: "SET_DIRECT"; ids: string[]; active: boolean }
  | { type: "SET_DIRECT_PREVIEW"; ids: string[] }
  | { type: "TOGGLE_FLAG"; flag: string }
  | { type: "TOGGLE_TAG"; tag: string }
  | { type: "TOGGLE_TEAM"; team: string }
  | {
      type: "SET_FILTERS";
      flags: ReadonlySet<string>;
      tags: ReadonlySet<string>;
      teams: ReadonlySet<string>;
    }
  | { type: "CLEAR_FILTERS" };

function reducer(state: HighlightState, action: Action): HighlightState {
  switch (action.type) {
    case "SET_DIRECT":
      return {
        ...state,
        directIds: action.ids,
        directActive: action.active,
        suppressTooltips: false,
      };
    case "SET_DIRECT_PREVIEW":
      return {
        ...state,
        directIds: action.ids,
        directActive: action.ids.length > 0,
        suppressTooltips: action.ids.length > 0,
      };
    case "TOGGLE_FLAG":
      return {
        ...state,
        activeFlags: toggleValue(state.activeFlags, action.flag),
      };
    case "TOGGLE_TAG":
      return {
        ...state,
        activeTags: toggleValue(state.activeTags, action.tag),
      };
    case "TOGGLE_TEAM":
      return {
        ...state,
        activeTeams: toggleValue(state.activeTeams, action.team),
      };
    case "CLEAR_FILTERS":
      return {
        ...state,
        activeFlags: emptySet,
        activeTags: emptySet,
        activeTeams: emptySet,
      };
    case "SET_FILTERS":
      return {
        ...state,
        activeFlags: action.flags,
        activeTags: action.tags,
        activeTeams: action.teams,
      };
    default:
      return state;
  }
}

function matchesFilters(
  item: Item,
  flags: ReadonlySet<string>,
  tags: ReadonlySet<string>,
  teams: ReadonlySet<string>,
): boolean {
  // OR within each dimension, AND across dimensions
  if (flags.size > 0 && !flags.has(item.flag)) return false;
  if (tags.size > 0 && !item.tags?.some((t) => tags.has(t))) return false;
  if (teams.size > 0 && !item.teams?.some((t) => teams.has(t))) return false;
  return true;
}

interface RadarHighlightContextValue {
  highlightedIds: string[];
  filterActive: boolean;
  suppressTooltips: boolean;
  activeFlags: ReadonlySet<string>;
  activeTags: ReadonlySet<string>;
  activeTeams: ReadonlySet<string>;
  setHighlight: (ids: string[], active: boolean) => void;
  setHighlightPreview: (ids: string[]) => void;
  toggleFlag: (flag: string) => void;
  toggleTag: (tag: string) => void;
  toggleTeam: (team: string) => void;
  clearFilters: () => void;
}

const RadarHighlightContext = createContext<RadarHighlightContextValue>({
  highlightedIds: [],
  filterActive: false,
  suppressTooltips: false,
  activeFlags: emptySet,
  activeTags: emptySet,
  activeTeams: emptySet,
  setHighlight: () => {},
  setHighlightPreview: () => {},
  toggleFlag: () => {},
  toggleTag: () => {},
  toggleTeam: () => {},
  clearFilters: () => {},
});

function parseParam(value: string | string[] | undefined): Set<string> {
  if (!value) return new Set();
  const str = Array.isArray(value) ? value[0] : value;
  if (!str) return new Set();
  return new Set(str.split(",").filter(Boolean));
}

function setsEqual(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) {
    if (!b.has(v)) return false;
  }
  return true;
}

const PARAM_FLAGS = "flags";
const PARAM_TAGS = "tags";
const PARAM_TEAMS = "teams";

export const RadarHighlightProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, initialState);
  const items = useMemo(() => getItems(), []);
  const isUpdatingUrl = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;
  const routerRef = useRef(router);
  routerRef.current = router;

  useEffect(() => {
    if (!router.isReady || isUpdatingUrl.current) return;

    const flags = parseParam(router.query[PARAM_FLAGS]);
    const tags = parseParam(router.query[PARAM_TAGS]);
    const teams = parseParam(router.query[PARAM_TEAMS]);

    const s = stateRef.current;
    if (
      setsEqual(flags, s.activeFlags) &&
      setsEqual(tags, s.activeTags) &&
      setsEqual(teams, s.activeTeams)
    ) {
      return;
    }

    dispatch({ type: "SET_FILTERS", flags, tags, teams });
  }, [router.isReady, router.query]);

  useEffect(() => {
    const r = routerRef.current;
    if (!r.isReady) return;

    const query = { ...r.query };
    let changed = false;

    for (const [param, set] of [
      [PARAM_FLAGS, state.activeFlags],
      [PARAM_TAGS, state.activeTags],
      [PARAM_TEAMS, state.activeTeams],
    ] as const) {
      const current = query[param];
      if (set.size > 0) {
        const value = [...set].join(",");
        if (current !== value) {
          query[param] = value;
          changed = true;
        }
      } else if (current !== undefined) {
        delete query[param];
        changed = true;
      }
    }

    if (!changed) return;

    isUpdatingUrl.current = true;
    r.replace({ pathname: r.pathname, query }, undefined, {
      shallow: true,
    }).then(() => {
      isUpdatingUrl.current = false;
    });
  }, [state.activeFlags, state.activeTags, state.activeTeams]);

  const hasFilter =
    state.activeFlags.size > 0 ||
    state.activeTags.size > 0 ||
    state.activeTeams.size > 0;

  const filterMatchIds = useMemo(() => {
    if (!hasFilter) return [] as string[];
    return items
      .filter((item) =>
        matchesFilters(
          item,
          state.activeFlags,
          state.activeTags,
          state.activeTeams,
        ),
      )
      .map((item) => item.id);
  }, [
    items,
    hasFilter,
    state.activeFlags,
    state.activeTags,
    state.activeTeams,
  ]);

  const highlightedIds = useMemo(() => {
    if (state.directActive && hasFilter) {
      const filterSet = new Set(filterMatchIds);
      return state.directIds.filter((id) => filterSet.has(id));
    }
    if (state.directActive) return state.directIds;
    if (hasFilter) return filterMatchIds;
    return [];
  }, [state.directActive, state.directIds, hasFilter, filterMatchIds]);

  const filterActive = state.directActive || hasFilter;

  const setHighlight = useCallback(
    (ids: string[], active: boolean) =>
      dispatch({ type: "SET_DIRECT", ids, active }),
    [],
  );
  const setHighlightPreview = useCallback(
    (ids: string[]) => dispatch({ type: "SET_DIRECT_PREVIEW", ids }),
    [],
  );
  const toggleFlag = useCallback(
    (flag: string) => dispatch({ type: "TOGGLE_FLAG", flag }),
    [],
  );
  const toggleTag = useCallback(
    (tag: string) => dispatch({ type: "TOGGLE_TAG", tag }),
    [],
  );
  const toggleTeam = useCallback(
    (team: string) => dispatch({ type: "TOGGLE_TEAM", team }),
    [],
  );
  const clearFilters = useCallback(
    () => dispatch({ type: "CLEAR_FILTERS" }),
    [],
  );

  const value = useMemo<RadarHighlightContextValue>(
    () => ({
      highlightedIds,
      filterActive,
      suppressTooltips: state.suppressTooltips,
      activeFlags: state.activeFlags,
      activeTags: state.activeTags,
      activeTeams: state.activeTeams,
      setHighlight,
      setHighlightPreview,
      toggleFlag,
      toggleTag,
      toggleTeam,
      clearFilters,
    }),
    [
      highlightedIds,
      filterActive,
      state.suppressTooltips,
      state.activeFlags,
      state.activeTags,
      state.activeTeams,
      setHighlight,
      setHighlightPreview,
      toggleFlag,
      toggleTag,
      toggleTeam,
      clearFilters,
    ],
  );

  return (
    <RadarHighlightContext.Provider value={value}>
      {children}
    </RadarHighlightContext.Provider>
  );
};

export function useRadarHighlight() {
  return useContext(RadarHighlightContext);
}
