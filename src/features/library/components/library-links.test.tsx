import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, test, vi } from "vitest";
import type { SnsLink } from "@/shared/domain";
import { LibraryLinks } from "./library-links";

const linked: SnsLink = {
  id: "l1",
  url: "https://instagram.com/p/bamboo",
  platform: "instagram",
  linked: [{ kind: "place", placeId: "damyang-juknokwon" }],
  tags: [],
  memo: "",
  sigun: null,
  createdAt: "2026-10-20T01:00:00.000Z",
} as unknown as SnsLink;

vi.mock("../hooks/use-library", () => ({
  useSnsLinks: () => ({ isPending: false, isError: false, data: [linked] }),
  useCustomPlaces: () => ({ data: [] }),
  useDeleteSnsLink: () => ({ mutate: vi.fn(), isPending: false }),
}));
// 장소 이름을 아직 불러오는 중 (링크 목록이 새로 바뀐 직후)
vi.mock("@/features/content", () => ({
  usePlacesByIds: () => ({ isPending: true, data: undefined }),
}));

describe("LibraryLinks", () => {
  test("장소 이름을 불러오는 동안에도 연결된 링크를 '연결 전'으로 보이지 않는다", () => {
    render(
      <MemoryRouter>
        <LibraryLinks />
      </MemoryRouter>,
    );
    expect(screen.queryByText(/장소 연결 전이에요/)).not.toBeInTheDocument();
    expect(screen.getByText("장소 1곳")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "고치기" })).toBeInTheDocument();
  });
});
