import {
  Dispatch,
  FC,
  ReactNode,
  SetStateAction,
  createContext,
  useContext,
  useState,
} from "react";

interface RadarHighlightState {
  highlightedIds: string[];
  setHighlightedIds: Dispatch<SetStateAction<string[]>>;
}

const RadarHighlightContext = createContext<RadarHighlightState>({
  highlightedIds: [],
  setHighlightedIds: () => {},
});

export const RadarHighlightProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [highlightedIds, setHighlightedIds] = useState<string[]>([]);

  return (
    <RadarHighlightContext.Provider
      value={{ highlightedIds, setHighlightedIds }}
    >
      {children}
    </RadarHighlightContext.Provider>
  );
};

export function useRadarHighlight() {
  return useContext(RadarHighlightContext);
}
