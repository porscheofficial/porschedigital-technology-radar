import { render, screen } from "@testing-library/react";
import type { Item, Segment } from "@/lib/types";
import { Flag } from "@/lib/types";
import ItemPage, { getStaticPaths } from "@/pages/[segment]/[id]";

const mockState = vi.hoisted(() => ({
  getAppName: vi.fn(),
  getItem: vi.fn(),
  getItems: vi.fn(),
  getSegment: vi.fn(),
  itemDetailProps: vi.fn(),
  seoHeadProps: vi.fn(),
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

vi.mock("@/components/SeoHead/SeoHead", () => ({
  SeoHead: (props: any) => {
    mockState.seoHeadProps(props);
    return <div data-testid="seo-head" />;
  },
}));

vi.mock("@/lib/config", () => ({
  default: { labels: { title: "Test Radar" } },
}));

vi.mock("@/lib/data", () => ({
  getAppName: mockState.getAppName,
  getItem: mockState.getItem,
  getItems: mockState.getItems,
  getSegment: mockState.getSegment,
}));

describe("Item detail page", () => {
  const segment: Segment = {
    id: "languages-and-frameworks",
    title: "Languages & Frameworks",
    description: "Programming languages and frameworks",
    position: 1,
  };

  const item: Item = {
    id: "react",
    title: "React",
    summary: "React summary",
    body: "<p>UI library</p>",
    featured: true,
    ring: "adopt",
    segment: segment.id,
    flag: Flag.Default,
    release: "2024-01",
    position: [0.1, 0.2],
    revisions: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockState.getAppName.mockReturnValue("Test Radar");
    mockState.getSegment.mockReturnValue(segment);
    mockState.getItem.mockReturnValue(item);
    mockState.getItems.mockReturnValue([item]);
  });

  it("renders the item title", () => {
    render(<ItemPage segmentId={segment.id} itemId={item.id} />);

    expect(screen.getByTestId("item-detail")).toHaveTextContent("React");
  });

  it("passes SEO props including article metadata image", () => {
    render(<ItemPage segmentId={segment.id} itemId={item.id} />);

    expect(mockState.seoHeadProps).toHaveBeenCalledWith({
      title: item.title,
      description: item.summary,
      path: `/${segment.id}/${item.id}/`,
      image: `/og/${segment.id}/${item.id}.png`,
      type: "article",
    });
    expect(
      document
        .querySelector('meta[property="article:section"]')
        ?.getAttribute("content"),
    ).toBe("Languages & Frameworks");
  });

  it("uses a custom ogImage when provided", () => {
    mockState.getItem.mockReturnValue({
      ...item,
      ogImage: "/images/react-card.png",
    });

    render(<ItemPage segmentId={segment.id} itemId={item.id} />);

    expect(mockState.seoHeadProps).toHaveBeenCalledWith(
      expect.objectContaining({ image: "/images/react-card.png" }),
    );
  });

  it("renders ItemDetail with the correct props", () => {
    render(<ItemPage segmentId={segment.id} itemId={item.id} />);

    expect(mockState.itemDetailProps).toHaveBeenCalledWith({
      item,
      segmentTitle: "Languages & Frameworks",
    });
  });

  it("returns null when the item is not found", () => {
    mockState.getItem.mockReturnValue(undefined);

    const { container } = render(
      <ItemPage segmentId={segment.id} itemId={item.id} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("returns null when the segment is not found", () => {
    mockState.getSegment.mockReturnValue(undefined);

    const { container } = render(
      <ItemPage segmentId={segment.id} itemId={item.id} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("creates static paths for all item detail pages", async () => {
    await expect(getStaticPaths({})).resolves.toEqual({
      paths: [{ params: { segment: segment.id, id: item.id } }],
      fallback: false,
    });
  });
});
