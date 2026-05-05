import { render, screen } from "@testing-library/react";
import { Chip } from "../Chip";

describe("Chip", () => {
  it("renders children inside the label", () => {
    render(<Chip kind="tag">frontend</Chip>);
    expect(screen.getByText("frontend")).toBeInTheDocument();
  });

  it("sets data-chip-kind for theme variable selection", () => {
    const { container } = render(<Chip kind="status">active</Chip>);
    expect(container.querySelector("[data-chip-kind='status']")).not.toBeNull();
  });

  it("applies the compact class when compact=true", () => {
    const { container } = render(
      <Chip kind="team" compact>
        team
      </Chip>,
    );
    expect(container.querySelector(".chip.compact")).not.toBeNull();
  });

  it("renders the iconSlot when provided", () => {
    render(
      <Chip kind="tag" iconSlot={<span data-testid="icon">i</span>}>
        x
      </Chip>,
    );
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("merges custom className", () => {
    const { container } = render(
      <Chip kind="tag" className="extra">
        x
      </Chip>,
    );
    expect(container.querySelector(".extra")).not.toBeNull();
  });
});
