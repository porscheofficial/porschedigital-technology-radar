import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import type { ComponentProps } from "react";

import { Flag, type Item } from "@/lib/types";
import { SpotlightSearch } from "../SpotlightSearch";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

const pushMock = vi.fn(() => Promise.resolve(true));
const eventHandlers = new Map<string, (...args: unknown[]) => void>();

vi.mock("next/router", () => ({
  useRouter: () => ({
    push: pushMock,
    events: {
      on: (event: string, handler: (...args: unknown[]) => void) => {
        eventHandlers.set(event, handler);
      },
      off: (event: string) => {
        eventHandlers.delete(event);
      },
    },
  }),
}));

const setHighlightMock = vi.fn();

vi.mock("@/lib/RadarHighlightContext", () => ({
  useRadarHighlight: () => ({
    setHighlight: setHighlightMock,
  }),
}));

const items: Item[] = [
  {
    id: "react",
    title: "React",
    summary: "A UI library for building component-driven interfaces.",
    body: "<p>full body</p>",
    featured: true,
    ring: "adopt",
    segment: "languages-and-frameworks",
    flag: Flag.Default,
    release: "2024-01",
    position: [0, 0],
    tags: ["frontend"],
    teams: ["web-platform"],
  },
  {
    id: "typescript",
    title: "TypeScript",
    summary: "Typed superset of JavaScript.",
    body: "<p>full body</p>",
    featured: true,
    ring: "adopt",
    segment: "languages-and-frameworks",
    flag: Flag.Default,
    release: "2024-01",
    position: [0, 0],
    tags: ["typed", "distributed"],
  },
  {
    id: "rtl-tool",
    title: "React Testing Library",
    body: "<p>full body</p>",
    featured: false,
    ring: "trial",
    segment: "tools",
    flag: Flag.Default,
    release: "2024-01",
    position: [0, 0],
  },
  {
    id: "kafka",
    title: "Kafka",
    summary: "A streaming platform.",
    body: "<p>An <strong>unicornquark</strong> distributed event log used in production systems.</p>",
    featured: false,
    ring: "trial",
    segment: "tools",
    flag: Flag.Default,
    release: "2024-01",
    position: [0, 0],
  },
];

vi.mock("@/lib/data", () => ({
  getItems: () => items,
  getLabel: (key: string) =>
    key === "searchPlaceholder" ? "Search the radar" : undefined,
  getSegment: (id: string) =>
    id === "languages-and-frameworks"
      ? {
          id,
          title: "Languages & Frameworks",
          description: "",
          color: "",
          position: 1,
        }
      : { id, title: "Tools", description: "", color: "", position: 2 },
  getRing: (id: string) =>
    id === "adopt"
      ? { id, title: "Adopt", description: "", color: "" }
      : { id, title: "Trial", description: "", color: "" },
}));

vi.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@porsche-design-system/components-react/ssr", () => ({
  PIcon: ({ name, ...rest }: ComponentProps<"span"> & { name: string }) => (
    <span data-icon={name} {...rest} />
  ),
}));

beforeEach(() => {
  pushMock.mockReset();
  pushMock.mockImplementation(() => Promise.resolve(true));
  setHighlightMock.mockReset();
  eventHandlers.clear();
});

describe("SpotlightSearch", () => {
  it("renders a trigger button with the keyboard hint", () => {
    render(<SpotlightSearch />);
    const trigger = screen.getByRole("button", { name: "Search the radar" });
    expect(trigger).toBeInTheDocument();
    expect(trigger.textContent).toContain("⌘K");
  });

  it("opens the dialog when the trigger is clicked", async () => {
    const user = userEvent.setup();
    render(<SpotlightSearch />);

    await user.click(screen.getByRole("button", { name: "Search the radar" }));

    expect(
      await screen.findByPlaceholderText("Search the radar"),
    ).toBeInTheDocument();
  });

  it("shows a Latest group with featured items when query is empty", async () => {
    const user = userEvent.setup();
    render(<SpotlightSearch />);

    await user.click(screen.getByRole("button", { name: "Search the radar" }));
    await screen.findByPlaceholderText("Search the radar");

    expect(screen.getByText("Latest")).toBeInTheDocument();
    const suggestionItems = document.querySelectorAll("[cmdk-item]");
    expect(suggestionItems.length).toBeGreaterThanOrEqual(2);
    expect(document.body.textContent).toContain("React");
    expect(document.body.textContent).toContain("TypeScript");
  });

  it("opens the dialog with the Cmd+K shortcut", async () => {
    render(<SpotlightSearch />);

    fireEvent.keyDown(document, { key: "k", metaKey: true });

    expect(
      await screen.findByPlaceholderText("Search the radar"),
    ).toBeInTheDocument();
  });

  it("opens the dialog with the Ctrl+K shortcut", async () => {
    render(<SpotlightSearch />);

    fireEvent.keyDown(document, { key: "k", ctrlKey: true });

    expect(
      await screen.findByPlaceholderText("Search the radar"),
    ).toBeInTheDocument();
  });

  it("filters by title substring", async () => {
    const user = userEvent.setup();
    render(<SpotlightSearch />);
    await user.click(screen.getByRole("button", { name: "Search the radar" }));

    const input = await screen.findByPlaceholderText("Search the radar");
    await user.type(input, "React");

    await waitFor(() => {
      const items = document.querySelectorAll("[cmdk-item]");
      expect(items.length).toBe(2);
    });
    expect(document.body.textContent).toContain("React Testing Library");
    expect(screen.queryByText("TypeScript")).not.toBeInTheDocument();
  });

  it("filters by abbreviation (rtl matches React Testing Library)", async () => {
    const user = userEvent.setup();
    render(<SpotlightSearch />);
    await user.click(screen.getByRole("button", { name: "Search the radar" }));

    const input = await screen.findByPlaceholderText("Search the radar");
    await user.type(input, "rtl");

    expect(
      await screen.findByText("React Testing Library"),
    ).toBeInTheDocument();
  });

  it("filters by extended fields (tags / teams)", async () => {
    const user = userEvent.setup();
    render(<SpotlightSearch />);
    await user.click(screen.getByRole("button", { name: "Search the radar" }));

    const input = await screen.findByPlaceholderText("Search the radar");
    await user.type(input, "web-platform");

    expect(await screen.findByText("React")).toBeInTheDocument();
    expect(screen.queryByText("TypeScript")).not.toBeInTheDocument();
  });

  it("shows an empty state when there are no matches", async () => {
    const user = userEvent.setup();
    render(<SpotlightSearch />);
    await user.click(screen.getByRole("button", { name: "Search the radar" }));

    const input = await screen.findByPlaceholderText("Search the radar");
    await user.type(input, "zzznomatch");

    expect(await screen.findByText("No results found.")).toBeInTheDocument();
  });

  it("renders a body snippet when the match is only in the body", async () => {
    const user = userEvent.setup();
    render(<SpotlightSearch />);
    await user.click(screen.getByRole("button", { name: "Search the radar" }));

    const input = await screen.findByPlaceholderText("Search the radar");
    await user.type(input, "unicornquark");

    await waitFor(() => {
      const cmdkItems = document.querySelectorAll("[cmdk-item]");
      expect(cmdkItems.length).toBe(1);
    });
    expect(document.body.textContent).toContain("Kafka");
    const snippet = document.querySelector(".itemSnippet");
    expect(snippet).not.toBeNull();
    expect(snippet?.textContent?.toLowerCase()).toContain("unicornquark");
    expect(snippet?.querySelector("mark")?.textContent?.toLowerCase()).toBe(
      "unicornquark",
    );
    expect(document.body.textContent).not.toContain("A streaming platform.");
  });

  it("ranks title matches above body-only matches", async () => {
    const user = userEvent.setup();
    render(<SpotlightSearch />);
    await user.click(screen.getByRole("button", { name: "Search the radar" }));

    const input = await screen.findByPlaceholderText("Search the radar");
    await user.type(input, "distributed");

    await waitFor(() => {
      const cmdkItems = document.querySelectorAll("[cmdk-item]");
      expect(cmdkItems.length).toBe(2);
    });
    const cmdkItems = Array.from(document.querySelectorAll("[cmdk-item]"));
    expect(cmdkItems[0]?.textContent).toContain("TypeScript");
    expect(cmdkItems[1]?.textContent).toContain("Kafka");
  });

  it("calls setHighlight (debounced) when the result set changes", async () => {
    const user = userEvent.setup();
    render(<SpotlightSearch />);
    await user.click(screen.getByRole("button", { name: "Search the radar" }));
    const input = await screen.findByPlaceholderText("Search the radar");
    await user.type(input, "react");

    await waitFor(
      () => {
        const lastCall =
          setHighlightMock.mock.calls[setHighlightMock.mock.calls.length - 1];
        expect(lastCall?.[0]).toEqual(
          expect.arrayContaining(["react", "rtl-tool"]),
        );
        expect(lastCall?.[1]).toBe(true);
      },
      { timeout: 1000 },
    );
  });

  it("navigates and closes when an item is selected", async () => {
    const user = userEvent.setup();
    render(<SpotlightSearch />);
    await user.click(screen.getByRole("button", { name: "Search the radar" }));

    const input = await screen.findByPlaceholderText("Search the radar");
    await user.type(input, "TypeScript");

    await waitFor(() => {
      expect(document.querySelectorAll("[cmdk-item]").length).toBe(1);
    });
    // Use Enter to trigger cmdk onSelect — more reliable than clicking the
    // <mark> wrapper inside the item in jsdom (no real pointer events).
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(
        "/languages-and-frameworks/typescript",
      );
    });
    await waitFor(() => {
      expect(
        screen.queryByPlaceholderText("Search the radar"),
      ).not.toBeInTheDocument();
    });
  });

  it("registers a routeChangeStart handler that closes the dialog", async () => {
    const user = userEvent.setup();
    render(<SpotlightSearch />);
    await user.click(screen.getByRole("button", { name: "Search the radar" }));
    expect(
      await screen.findByPlaceholderText("Search the radar"),
    ).toBeInTheDocument();

    const handler = eventHandlers.get("routeChangeStart");
    expect(handler).toBeDefined();
    handler?.("/some/path", { shallow: false });

    await waitFor(() => {
      expect(
        screen.queryByPlaceholderText("Search the radar"),
      ).not.toBeInTheDocument();
    });
  });

  it("shows a hotkey badge on the first 9 items and navigates on Cmd+digit", async () => {
    const user = userEvent.setup();
    render(<SpotlightSearch />);

    await user.click(screen.getByRole("button", { name: "Search the radar" }));
    await screen.findByPlaceholderText("Search the radar");

    expect(screen.getByLabelText("Cmd+1")).toBeInTheDocument();
    expect(screen.getByLabelText("Cmd+2")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "2", metaKey: true });

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(
        "/languages-and-frameworks/typescript",
      );
    });
  });

  it("shows actions list when query starts with > prefix", async () => {
    const user = userEvent.setup();
    render(<SpotlightSearch />);
    await user.click(screen.getByRole("button", { name: /search/i }));

    const input = await screen.findByRole("combobox");
    await user.type(input, ">");

    expect(document.querySelector("[cmdk-group-heading]")?.textContent).toBe(
      "Actions",
    );
    expect(screen.getByText("Copy link to current page")).toBeInTheDocument();
    expect(screen.getByText("Go to Changelog")).toBeInTheDocument();
    expect(screen.queryByText("Latest")).not.toBeInTheDocument();
  });

  it("filters actions by label substring in command mode", async () => {
    const user = userEvent.setup();
    render(<SpotlightSearch />);
    await user.click(screen.getByRole("button", { name: /search/i }));

    const input = await screen.findByRole("combobox");
    await user.type(input, ">copy");

    expect(screen.getByText("Copy link to current page")).toBeInTheDocument();
    expect(screen.queryByText("Go to Changelog")).not.toBeInTheDocument();
  });
});
