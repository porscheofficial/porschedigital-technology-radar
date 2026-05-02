import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getRing } from "@/lib/data";
import { Badge, RingBadge } from "../Badge";

vi.mock("@/lib/data", () => ({
  getRing: vi.fn(),
}));

const mockGetRing = getRing as ReturnType<typeof vi.fn>;

describe("Badge", () => {
  beforeEach(() => {
    mockGetRing.mockReset();
  });

  it("renders children", () => {
    render(<Badge>Adopt</Badge>);

    expect(screen.getByText("Adopt")).toBeInTheDocument();
  });

  it.each([
    "small",
    "medium",
    "large",
  ] as const)("applies the %s size class", (size) => {
    render(<Badge size={size}>Sized</Badge>);

    expect(screen.getByText("Sized")).toHaveClass(`size-${size}`);
  });

  it("applies the badge color CSS variable", () => {
    render(<Badge color="#93c47d">Colored</Badge>);

    expect(screen.getByText("Colored")).toHaveStyle({ "--badge": "#93c47d" });
  });

  it("renders as a button when onClick is provided", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<Badge onClick={handleClick}>Clickable</Badge>);

    const badge = screen.getByRole("button", { name: "Clickable" });
    await user.click(badge);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("renders as a span when onClick is not provided", () => {
    render(<Badge>Static</Badge>);

    expect(screen.getByText("Static").tagName).toBe("SPAN");
  });

  it("applies selectable and selected classes", () => {
    render(
      <Badge selectable selected>
        Selectable
      </Badge>,
    );

    expect(screen.getByText("Selectable")).toHaveClass("selectable");
    expect(screen.getByText("Selectable")).toHaveClass("selected");
  });

  it("spreads additional props", () => {
    render(
      <Badge className="extra-class" data-testid="badge" data-state="active">
        Props
      </Badge>,
    );

    expect(screen.getByTestId("badge")).toHaveClass("extra-class");
    expect(screen.getByTestId("badge")).toHaveAttribute("data-state", "active");
  });
});

describe("RingBadge", () => {
  beforeEach(() => {
    mockGetRing.mockReset();
  });

  it("renders the ring title", () => {
    mockGetRing.mockReturnValue({ title: "Adopt", color: "#93c47d" });

    render(<RingBadge ring="adopt" />);

    expect(screen.getByText("Adopt")).toBeInTheDocument();
  });

  it("renders the ring title with the formatted release date", () => {
    mockGetRing.mockReturnValue({ title: "Adopt", color: "#93c47d" });

    render(<RingBadge ring="adopt" release="2024-03" />);

    expect(screen.getByText("Adopt | March 2024")).toBeInTheDocument();
  });

  it("returns null for an unknown ring", () => {
    mockGetRing.mockReturnValue(null);
    const { container } = render(<RingBadge ring="unknown" />);

    expect(container).toBeEmptyDOMElement();
  });
});
