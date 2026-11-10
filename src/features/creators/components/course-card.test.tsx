import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import type { CreatorCourse } from "@/shared/domain";
import { CourseCard } from "./course-card";

const course: CreatorCourse = {
  id: "c1",
  title: "순천 정원 코스",
  creator: { name: "남도여행길잡이" },
  sourceUrl: "https://example.com",
  siguns: ["suncheon"],
  tags: ["정원"],
  orderBasis: "editor_suggested",
  days: [{ day: 1, items: [{ placeId: "a" }, { placeId: "b" }] }],
  status: "published",
  updatedAt: "2026-10-19T00:00:00.000Z",
};

const renderCard = (cover: string | null | undefined) =>
  render(
    <MemoryRouter>
      <CourseCard course={course} cover={cover} />
    </MemoryRouter>,
  );

describe("CourseCard", () => {
  it("사진이 있으면 카드 위에 사진을 깔고, 카드 전체가 상세로 가는 링크다", () => {
    const { container } = renderCard("https://storage.example/a.jpg");
    const link = screen.getByRole("link", { name: /순천 정원 코스/ });
    expect(link).toHaveAttribute("href", "/creators/c1");
    const img = container.querySelector("img");
    expect(img).toHaveAttribute("src", "https://storage.example/a.jpg");
    expect(img).toHaveAttribute("loading", "lazy");
    expect(link).toContainElement(img);
    expect(screen.getByText("순천시 · 장소 2곳")).toBeInTheDocument();
  });

  it("불러오는 중이면 사진 자리에 스켈레톤, 사진이 없으면 지역 이름을 둔다", () => {
    const { container, rerender } = renderCard(undefined);
    expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
    rerender(
      <MemoryRouter>
        <CourseCard course={course} cover={null} />
      </MemoryRouter>,
    );
    expect(container.querySelector('[data-slot="skeleton"]')).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("순천시")).toBeInTheDocument();
  });
});
