import { fireEvent, render } from "@testing-library/react";

import { SearchBar } from "@/components/SearchBar/SearchBar";
import { Flag } from "@/lib/types";

const setHighlight = vi.fn();

const routerEventHandlers = vi.hoisted(
  () => new Map<string, ((...args: unknown[]) => void)[]>(),
);

const mockRouter = vi.hoisted(() => ({
  push: vi.fn().mockResolvedValue(true),
  events: {
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      const list = routerEventHandlers.get(event) ?? [];
      list.push(handler);
      routerEventHandlers.set(event, list);
    }),
    off: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      const list = routerEventHandlers.get(event) ?? [];
      routerEventHandlers.set(
        event,
        list.filter((h) => h !== handler),
      );
    }),
  },
}));

vi.mock("next/router", () => ({
  useRouter: vi.fn(() => mockRouter),
}));

vi.mock("@porsche-design-system/components-react/ssr", () => ({
  PIcon: () => <span data-testid="p-icon" />,
}));

vi.mock("@/lib/RadarHighlightContext", () => ({
  useRadarHighlight: vi.fn(() => ({ setHighlight })),
}));

vi.mock("@/lib/data", () => ({
  getItems: vi.fn(() => [
    {
      id: "react",
      title: "React",
      body: "",
      featured: false,
      release: "2024-01",
      segment: "tools",
      ring: "adopt",
      flag: Flag.Default,
      position: [0, 0],
      revisions: [],
    },
  ]),
  getLabel: vi.fn(() => "Search"),
  getSegment: vi.fn(() => ({ id: "tools", title: "Tools" })),
  getRing: vi.fn(() => ({ id: "adopt", title: "Adopt" })),
}));

describe("SearchBar highlight-preservation guards", () => {
  beforeEach(() => {
    setHighlight.mockClear();
    routerEventHandlers.clear();
  });

  it("does NOT call setHighlight when 'routeChangeStart' fires (preserves wedge-click highlight across nav)", () => {
    render(<SearchBar />);
    setHighlight.mockClear();

    const handlers = routerEventHandlers.get("routeChangeStart") ?? [];
    expect(handlers.length).toBeGreaterThan(0);
    for (const handler of handlers) handler();

    expect(setHighlight).not.toHaveBeenCalled();
  });

  it("does NOT call setHighlight on outside clicks when the dropdown is closed (preserves wedge-click highlight)", () => {
    render(<SearchBar />);
    setHighlight.mockClear();

    fireEvent.mouseDown(document.body);

    expect(setHighlight).not.toHaveBeenCalled();
  });

  it("DOES call setHighlight([], false) on outside click when the dropdown IS open (intentional dismissal)", () => {
    const { container } = render(<SearchBar />);
    const input = container.querySelector("input");
    expect(input).not.toBeNull();
    if (!input) return;

    fireEvent.change(input, { target: { value: "react" } });
    setHighlight.mockClear();

    fireEvent.mouseDown(document.body);

    expect(setHighlight).toHaveBeenCalledWith([], false);
  });
});
