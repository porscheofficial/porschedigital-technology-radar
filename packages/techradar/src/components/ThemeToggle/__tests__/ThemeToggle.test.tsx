import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useTheme } from "@/lib/ThemeContext";
import { ThemeToggle } from "../ThemeToggle";

vi.mock("@/lib/ThemeContext", () => ({
  useTheme: vi.fn(),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@porsche-design-system/components-react/ssr", () => ({
  PIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

const mockUseTheme = useTheme as ReturnType<typeof vi.fn>;

const dualTheme = {
  id: "porsche",
  label: "Porsche",
  supports: ["light", "dark"],
  default: "dark",
} as const;

describe("ThemeToggle", () => {
  it("hides itself for single-mode themes", () => {
    mockUseTheme.mockReturnValue({
      theme: { id: "acme", label: "Acme", supports: ["dark"], default: "dark" },
      mode: "dark",
      setMode: vi.fn(),
    });

    const { container } = render(<ThemeToggle />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders three labelled segments with sun/laptop/moon icons", () => {
    mockUseTheme.mockReturnValue({
      theme: dualTheme,
      mode: "system",
      setMode: vi.fn(),
    });

    render(<ThemeToggle />);

    expect(
      screen.getByRole("button", { name: "Theme mode: Light" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Theme mode: System" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Theme mode: Dark" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("icon-sun")).toBeInTheDocument();
    expect(screen.getByTestId("icon-laptop")).toBeInTheDocument();
    expect(screen.getByTestId("icon-moon")).toBeInTheDocument();
  });

  it("marks only the active mode as pressed", () => {
    mockUseTheme.mockReturnValue({
      theme: dualTheme,
      mode: "light",
      setMode: vi.fn(),
    });

    render(<ThemeToggle />);

    expect(
      screen.getByRole("button", { name: "Theme mode: Light" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: "Theme mode: System" }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(
      screen.getByRole("button", { name: "Theme mode: Dark" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("invokes setMode with the clicked segment, not a cycle", async () => {
    const user = userEvent.setup();
    const setMode = vi.fn();

    mockUseTheme.mockReturnValue({
      theme: dualTheme,
      mode: "light",
      setMode,
    });

    render(<ThemeToggle />);

    await user.click(screen.getByRole("button", { name: "Theme mode: Dark" }));
    expect(setMode).toHaveBeenLastCalledWith("dark");

    await user.click(
      screen.getByRole("button", { name: "Theme mode: System" }),
    );
    expect(setMode).toHaveBeenLastCalledWith("system");

    await user.click(screen.getByRole("button", { name: "Theme mode: Light" }));
    expect(setMode).toHaveBeenLastCalledWith("light");
  });

  it("positions the sliding indicator by the selected segment index", () => {
    mockUseTheme.mockReturnValue({
      theme: dualTheme,
      mode: "dark",
      setMode: vi.fn(),
    });

    const { container } = render(<ThemeToggle />);
    const indicator = container.querySelector("[aria-hidden='true']");

    expect(indicator).not.toBeNull();
    expect(indicator?.getAttribute("style")).toContain(
      "--rtk-theme-toggle-index: 2",
    );
  });
});
