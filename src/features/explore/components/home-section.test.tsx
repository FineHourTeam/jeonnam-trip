import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { HomeSection } from "./home-section";

const base = {
  title: "오늘 열리는 축제",
  moreTo: "/festivals?date=2026-10-20",
  isPending: false,
  isError: false,
  errorTitle: "축제를 불러오지 못했어요",
  onRetry: () => undefined,
  empty: null as ReactNode,
};

const renderSection = (props: Partial<typeof base>) =>
  render(
    <MemoryRouter>
      <HomeSection {...base} {...props}>
        <li>카드</li>
      </HomeSection>
    </MemoryRouter>,
  );

describe("HomeSection", () => {
  it("전체 보기는 지금 조건이 붙은 목록으로 간다", () => {
    renderSection({});
    expect(screen.getByRole("link", { name: "오늘 열리는 축제 전체 보기" })).toHaveAttribute(
      "href",
      "/festivals?date=2026-10-20",
    );
    expect(screen.getByText("카드")).toBeInTheDocument();
  });

  it("실패하면 안내와 다시 시도를 보여 주고, 누르면 다시 부른다", async () => {
    const onRetry = vi.fn();
    renderSection({ isError: true, onRetry });
    expect(screen.getByText("축제를 불러오지 못했어요")).toBeInTheDocument();
    expect(screen.queryByText("카드")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("결과가 없으면 카드 대신 빈 안내를 보여 준다", () => {
    renderSection({ empty: <p>열리는 축제가 없어요</p> });
    expect(screen.getByText("열리는 축제가 없어요")).toBeInTheDocument();
    expect(screen.queryByText("카드")).not.toBeInTheDocument();
  });
});
