import {
  createContext,
  type FC,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useReducer,
} from "react";

import { getItems } from "@/lib/data";
import type { Item } from "@/lib/types";

interface HighlightState {
  directIds: string[];
  directActive: boolean;
  activeFlag: string | null;
  activeTag: string | null;
  activeTeam: string | null;
}

const initialState: HighlightState = {
  directIds: [],
  directActive: false,
  activeFlag: null,
  activeTag: null,
  activeTeam: null,
};

type Action =
  | { type: "SET_DIRECT"; ids: string[]; active: boolean }
  | { type: "TOGGLE_FLAG"; flag: string }
  | { type: "TOGGLE_TAG"; tag: string }
  | { type: "TOGGLE_TEAM"; team: string };

function reducer(state: HighlightState, action: Action): HighlightState {
  switch (action.type) {
    case "SET_DIRECT":
      return { ...state, directIds: action.ids, directActive: action.active };
    case "TOGGLE_FLAG":
      return {
        ...state,
        activeFlag: state.activeFlag === action.flag ? null : action.flag,
      };
    case "TOGGLE_TAG":
      return {
        ...state,
        activeTag: state.activeTag === action.tag ? null : action.tag,
      };
    case "TOGGLE_TEAM":
      return {
        ...state,
        activeTeam: state.activeTeam === action.team ? null : action.team,
      };
    default:
      return state;
  }
}

function matchesFilters(
  item: Item,
  flag: string | null,
  tag: string | null,
  team: string | null,
): boolean {
  if (flag && item.flag !== flag) return false;
  if (tag && !item.tags?.includes(tag)) return false;
  if (team && !item.teams?.includes(team)) return false;
  return true;
}

interface RadarHighlightContextValue {
  highlightedIds: string[];
  filterActive: boolean;
  activeFlag: string | null;
  activeTag: string | null;
  activeTeam: string | null;
  setHighlight: (ids: string[], active: boolean) => void;
  toggleFlag: (flag: string) => void;
  toggleTag: (tag: string) => void;
  toggleTeam: (team: string) => void;
}

const RadarHighlightContext = createContext<RadarHighlightContextValue>({
  highlightedIds: [],
  filterActive: false,
  activeFlag: null,
  activeTag: null,
  activeTeam: null,
  setHighlight: () => {},
  toggleFlag: () => {},
  toggleTag: () => {},
  toggleTeam: () => {},
});

export const RadarHighlightProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const items = useMemo(() => getItems(), []);

  const hasFilter =
    state.activeFlag !== null ||
    state.activeTag !== null ||
    state.activeTeam !== null;

  const filterMatchIds = useMemo(() => {
    if (!hasFilter) return [] as string[];
    return items
      .filter((item) =>
        matchesFilters(
          item,
          state.activeFlag,
          state.activeTag,
          state.activeTeam,
        ),
      )
      .map((item) => item.id);
  }, [items, hasFilter, state.activeFlag, state.activeTag, state.activeTeam]);

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

  const value = useMemo<RadarHighlightContextValue>(
    () => ({
      highlightedIds,
      filterActive,
      activeFlag: state.activeFlag,
      activeTag: state.activeTag,
      activeTeam: state.activeTeam,
      setHighlight,
      toggleFlag,
      toggleTag,
      toggleTeam,
    }),
    [
      highlightedIds,
      filterActive,
      state.activeFlag,
      state.activeTag,
      state.activeTeam,
      setHighlight,
      toggleFlag,
      toggleTag,
      toggleTeam,
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
