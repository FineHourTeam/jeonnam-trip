// 검색 탭 — 마커를 눌러 뜬 카드에서 고른 일차에 담는지, 그 일차에 이미 있으면 막는지만 확인한다. 지도·조회는 대역으로 바꾼다.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { Place, TripDraft } from "@/shared/domain";
import type { TripEdit } from "../hooks/use-trip-editor";
import { RouteSearchPanel, type SearchDay } from "./route-search-panel";

const toast = vi.hoisted(() => vi.fn());
vi.mock("sonner", () => ({ toast }));
vi.mock("@/features/map", () => ({
  CourseMap: ({
    candidates = [],
    onSelectCandidate,
  }: {
    candidates?: { id: string; label: string }[];
    onSelectCandidate?: (id: string) => void;
  }) => (
    <div>
      {candidates.map((c) => (
        <button key={c.id} type="button" onClick={() => onSelectCandidate?.(c.id)}>
          마커 {c.label}
        </button>
      ))}
    </div>
  ),
}));
const place = {
  id: "p1",
  name: "유달산",
  category: "nature",
  sigun: "mokpo",
  location: { lat: 34.79, lng: 126.37 },
  photos: [],
} as unknown as Place;
vi.mock("@/features/places", () => ({
  usePlaces: () => ({
    data: { pages: [{ places: [place] }] },
    isPending: false,
    isError: false,
    hasNextPage: false,
    isFetching: false,
    isFetchingNextPage: false,
    isFetchNextPageError: false,
    fetchNextPage: () => undefined,
    refetch: () => undefined,
  }),
}));
vi.mock("@/features/trips", () => ({
  addItemsToDay: (trip: TripDraft, dayIndex: number) => ({ trip: { ...trip, addedTo: dayIndex } }),
  visitFromPlace: (p: Place) => ({ id: p.id }),
}));
vi.mock("./place-search-panel", () => ({ PlaceSearchFilterBar: () => null }));

beforeAll(() => {
  // Radix Select가 jsdom에 없는 포인터 API를 부른다
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.releasePointerCapture = () => undefined;
  Element.prototype.scrollIntoView = () => undefined;
});

const days = (second: string[] = []): SearchDay[] => [
  { label: "1일차", fullLabel: "1일차 · 11월 10일 (화)", placeIds: new Set() },
  { label: "2일차", fullLabel: "2일차 · 11월 11일 (수)", placeIds: new Set(second) },
];

function renderPanel(searchDays: SearchDay[]) {
  const update = vi.fn<(edit: TripEdit) => void>();
  render(
    <MemoryRouter>
      <RouteSearchPanel
        filters={{ q: "", category: null, sigun: "mokpo" }}
        onFiltersChange={() => undefined}
        near={false}
        onNearChange={() => undefined}
        radiusKm={3}
        onRadiusChange={() => undefined}
        routeSiguns={[]}
        points={[]}
        paths={[]}
        dayIndex={0}
        days={searchDays}
        addedIds={new Set()}
        update={update}
      />
    </MemoryRouter>,
  );
  const addedTo = () => {
    const edit = update.mock.calls[0]?.[0];
    return edit && (edit({} as TripDraft) as TripDraft & { addedTo: number }).addedTo;
  };
  return { update, addedTo };
}

describe("RouteSearchPanel", () => {
  it("목록 없이 마커를 누르면 카드가 뜨고, 기본은 보고 있는 일차에 담는다", async () => {
    const { addedTo } = renderPanel(days());
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.getByText("지도에서 장소를 눌러 보세요.")).toBeInTheDocument();
    expect(screen.getByText("장소 1곳")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "마커 유달산" }));
    await userEvent.click(screen.getByRole("button", { name: "1일차에 추가" }));
    expect(addedTo()).toBe(0);
    expect(toast).toHaveBeenCalledWith("「유달산」 장소를 1일차에 담았어요.");
  });

  it("일차를 바꿔 담고, 그 일차에 이미 있으면 막는다", async () => {
    const { update } = renderPanel(days(["p1"]));
    await userEvent.click(screen.getByRole("button", { name: "마커 유달산" }));
    await userEvent.click(screen.getByRole("combobox", { name: "담을 일차" }));
    await userEvent.click(screen.getByRole("option", { name: "2일차 · 11월 11일 (수)" }));
    expect(screen.getByRole("button", { name: "2일차에 담겨 있어요" })).toBeDisabled();
    expect(update).not.toHaveBeenCalled();
  });

  it("다른 일차를 골라 담으면 그 일차로 들어간다", async () => {
    const { addedTo } = renderPanel(days());
    await userEvent.click(screen.getByRole("button", { name: "마커 유달산" }));
    await userEvent.click(screen.getByRole("combobox", { name: "담을 일차" }));
    await userEvent.click(screen.getByRole("option", { name: "2일차 · 11월 11일 (수)" }));
    await userEvent.click(screen.getByRole("button", { name: "2일차에 추가" }));
    expect(addedTo()).toBe(1);
  });
});
