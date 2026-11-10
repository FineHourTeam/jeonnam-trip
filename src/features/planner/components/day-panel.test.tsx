// 일차 패널 — 지도 높이 회귀(탭 안 지도가 0 높이) · 탭 전환 · 경고 한 줄만 확인한다. 지도·검색·카드는 대역으로 바꾼다.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import type { TripDay, TripDraft, VisitItem } from "@/shared/domain";
import type { DaySchedule, Issue, ScheduledItem } from "../lib/schedule";
import { DayPanel } from "./day-panel";

let schedule: DaySchedule;

vi.mock("@/features/map", () => ({
  CourseMap: ({ className }: { className?: string }) => (
    <div data-testid="course-map" className={className} />
  ),
}));
vi.mock("@/features/places", () => ({
  usePlacesByIds: () => ({ data: [], isError: false }),
}));
vi.mock("@/lib/use-media-query", () => ({ useMediaQuery: () => true }));
vi.mock("../hooks/use-day-schedule", () => ({
  useDaySchedule: () => ({ schedule, legs: [], retryFailed: () => undefined, isFetching: false }),
}));
vi.mock("./route-search-panel", () => ({ RouteSearchPanel: () => <div>검색 패널</div> }));
vi.mock("./add-place-dialog", () => ({ AddPlaceDialog: () => null }));
vi.mock("./visit-card", () => ({ VisitCard: () => null }));

const item: VisitItem = {
  id: "a",
  ref: { kind: "place", placeId: "a" },
  snapshot: {
    name: "카페",
    category: "cafe",
    location: { lat: 34.8, lng: 126.4 },
    capturedAt: "",
  },
  stayMin: 60,
  stayLocked: false,
};
const day: TripDay = { date: "2026-10-17", startTime: "09:00", endTime: "20:00", items: [item] };
const trip = { siguns: [], days: [day] } as unknown as TripDraft;

function withIssues(issues: Issue[]): DaySchedule {
  const s: ScheduledItem = {
    itemId: "a",
    arrive: 600,
    start: 600,
    waitMin: 0,
    stayMin: 60,
    depart: 660,
    latestStart: null,
    latestDepart: null,
    slot: null,
    slots: null,
    issues,
  };
  return { items: [s], status: "ok", driveMin: 0, distanceM: 0, routesComplete: true };
}

const renderPanel = () =>
  render(
    <MemoryRouter>
      <DayPanel trip={trip} day={day} dayIndex={0} update={() => undefined} />
    </MemoryRouter>,
  );

describe("DayPanel", () => {
  it("내 경로 지도는 탭 안에서도 명시적 높이를 가진다", () => {
    schedule = withIssues([]);
    renderPanel();
    const map = screen.getByTestId("course-map");
    expect(map).toHaveClass("h-96", "lg:h-160");
    // TabsContent 기본 flex-1(기준 0%)이 남으면 세로 flex 안에서 높이가 0으로 접힌다
    const panel = map.closest('[role="tabpanel"]');
    expect(panel).toHaveClass("flex-none");
    expect(panel).not.toHaveClass("flex-1");
  });

  it("검색 탭에 다녀와도 지도를 다시 그린다", async () => {
    schedule = withIssues([]);
    renderPanel();
    await userEvent.click(screen.getByRole("tab", { name: "검색" }));
    expect(screen.getByText("검색 패널")).toBeInTheDocument();
    // 검색 탭 지도는 탭 내용의 높이를 채우므로 탭 내용이 명시적 높이 + flex-none이어야 한다
    const search = screen.getByText("검색 패널").closest('[role="tabpanel"]');
    expect(search).toHaveClass("h-160", "flex-none");
    expect(search).not.toHaveClass("flex-1");
    expect(screen.queryByTestId("course-map")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "내 경로" }));
    expect(screen.getByTestId("course-map")).toHaveClass("h-96", "lg:h-160");
  });

  it("문제가 없으면 요약·경고를 보이지 않는다", () => {
    schedule = withIssues([]);
    renderPanel();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("충돌이 있으면 충돌 개수를 한 줄로 알린다", () => {
    schedule = withIssues([{ kind: "closed" }]);
    renderPanel();
    expect(screen.getByRole("status")).toHaveTextContent("방문하기 어려운 곳이 1곳 있어요");
  });

  it("경로 실패 등 확인이 필요하면 그 개수를 알린다", () => {
    schedule = withIssues([{ kind: "route_failed" }]);
    renderPanel();
    expect(screen.getByRole("status")).toHaveTextContent("확인이 필요한 곳이 1곳 있어요");
  });

  it("경로 계산 중에는 경고하지 않는다", () => {
    schedule = withIssues([{ kind: "route_pending" }]);
    renderPanel();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
