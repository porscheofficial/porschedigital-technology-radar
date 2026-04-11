import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DemoDisclaimer } from "../DemoDisclaimer";

describe("DemoDisclaimer", () => {
  const storageKey = "radar-disclaimer-dismissed";
  let getItemSpy: ReturnType<typeof vi.fn>;
  let setItemSpy: ReturnType<typeof vi.fn>;
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    getItemSpy = vi.fn((key: string) => store[key] ?? null);
    setItemSpy = vi.fn((key: string, value: string) => {
      store[key] = value;
    });
    Object.defineProperty(window, "localStorage", {
      value: { getItem: getItemSpy, setItem: setItemSpy },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the disclaimer when not previously dismissed", async () => {
    render(<DemoDisclaimer />);

    await waitFor(() => {
      expect(
        screen.getByText(/visualization purposes only/),
      ).toBeInTheDocument();
    });
  });

  it("does not render when previously dismissed", async () => {
    store[storageKey] = "1";

    render(<DemoDisclaimer />);

    await waitFor(() => {
      expect(
        screen.queryByText(/visualization purposes only/),
      ).not.toBeInTheDocument();
    });
  });

  it("hides and persists dismissal on close click", async () => {
    const user = userEvent.setup();

    render(<DemoDisclaimer />);

    await waitFor(() => {
      expect(
        screen.getByText(/visualization purposes only/),
      ).toBeInTheDocument();
    });

    const closeButton = screen.getByRole("button", {
      name: "Dismiss disclaimer",
    });
    await user.click(closeButton);

    expect(
      screen.queryByText(/visualization purposes only/),
    ).not.toBeInTheDocument();
    expect(setItemSpy).toHaveBeenCalledWith(storageKey, "1");
  });

  it("renders when localStorage.getItem throws", async () => {
    getItemSpy.mockImplementation(() => {
      throw new Error("SecurityError");
    });

    render(<DemoDisclaimer />);

    await waitFor(() => {
      expect(
        screen.getByText(/visualization purposes only/),
      ).toBeInTheDocument();
    });
  });

  it("has an accessible role", async () => {
    render(<DemoDisclaimer />);

    await waitFor(() => {
      expect(screen.getByRole("status")).toBeInTheDocument();
    });
  });
});
