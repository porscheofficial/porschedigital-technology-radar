import { render, screen } from "@testing-library/react";
import type { Item, Quadrant } from "@/lib/types";
import { Flag } from "@/lib/types";
import ItemPage, { getStaticPaths } from "@/pages/[quadrant]/[id]";

const mockState = vi.hoisted(() => ({
  getAppName: vi.fn(),
  getItem: vi.fn(),
  getItems: vi.fn(),
  getQuadrant: vi.fn(),
  itemDetailProps: vi.fn(),
}));

vi.mock("next/head", () => ({
  default: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/components/ItemDetail/ItemDetail", () => ({
  ItemDetail: (props: any) => {
    mockState.itemDetailProps(props);
    return <div data-testid="item-detail">{props.item.title}</div>;
  },
}));

vi.mock("@/lib/config", () => ({
  default: { labels: { title: "Test Radar" } },
}));

vi.mock("@/lib/data", () => ({
  getAppName: mockState.getAppName,
  getItem: mockState.getItem,
  getItems: mockState.getItems,
  getQuadrant: mockState.getQuadrant,
}));

describe("Item detail page", () => {
  const quadrant: Quadrant = {
    id: "languages-and-frameworks",
    title: "Languages & Frameworks",
    description: "Programming languages and frameworks",
    color: "#0f0",
    position: 1,
  };

  const item: Item = {
    id: "react",
    title: "React",
    body: "<p>UI library</p>",
    featured: true,
    ring: "adopt",
    quadrant: quadrant.id,
    flag: Flag.Default,
    release: "2024-01",
    position: [0.1, 0.2],
    revisions: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockState.getAppName.mockReturnValue("Test Radar");
    mockState.getQuadrant.mockReturnValue(quadrant);
    mockState.getItem.mockReturnValue(item);
    mockState.getItems.mockReturnValue([item]);
  });

  it("renders the item title", () => {
    render(<ItemPage quadrantId={quadrant.id} itemId={item.id} />);

    expect(screen.getByTestId("item-detail")).toHaveTextContent("React");
  });

  it("renders ItemDetail with the correct props", () => {
    render(<ItemPage quadrantId={quadrant.id} itemId={item.id} />);

    expect(mockState.itemDetailProps).toHaveBeenCalledWith({
      item,
      quadrantTitle: "Languages & Frameworks",
    });
  });

  it("returns null when the item is not found", () => {
    mockState.getItem.mockReturnValue(undefined);

    const { container } = render(
      <ItemPage quadrantId={quadrant.id} itemId={item.id} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("returns null when the quadrant is not found", () => {
    mockState.getQuadrant.mockReturnValue(undefined);

    const { container } = render(
      <ItemPage quadrantId={quadrant.id} itemId={item.id} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("creates static paths for all item detail pages", async () => {
    await expect(getStaticPaths({} as any)).resolves.toEqual({
      paths: [{ params: { quadrant: quadrant.id, id: item.id } }],
      fallback: false,
    });
  });
});
