import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { addDays, todayKst } from "@/shared/lib/date";
import { TripSetupForm } from "./trip-setup-form";

describe("TripSetupForm", () => {
  it("4일을 넘는 기간은 막는다", async () => {
    const onSubmit = vi.fn();
    render(<TripSetupForm onSubmit={onSubmit} />);
    const start = screen.getByLabelText("시작일");
    const end = screen.getByLabelText("종료일");
    await userEvent.clear(start);
    await userEvent.type(start, "2030-05-01");
    await userEvent.clear(end);
    await userEvent.type(end, "2030-05-05");
    await userEvent.click(screen.getByRole("button", { name: "코스 만들기" }));
    expect(await screen.findByText("여행 기간은 최대 4일까지 만들 수 있어요.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("지역·속도를 골라 제출한다", async () => {
    const onSubmit = vi.fn();
    render(<TripSetupForm onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole("radio", { name: "여유롭게" }));
    await userEvent.click(screen.getByRole("button", { name: "목포시" }));
    await userEvent.click(screen.getByRole("button", { name: "코스 만들기" }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ title: "새 여행", siguns: ["mokpo"], pace: "relaxed" }),
    );
  });

  it("코스 일수가 늦게 와도 사용자가 고친 값은 지우지 않는다", async () => {
    const onSubmit = vi.fn();
    const { rerender } = render(<TripSetupForm onSubmit={onSubmit} />);
    const title = screen.getByLabelText("여행 제목 (선택)");
    await userEvent.type(title, "가을 여행");
    rerender(<TripSetupForm onSubmit={onSubmit} defaultDays={3} />);
    expect(title).toHaveValue("가을 여행");
    expect(screen.getByLabelText("종료일")).toHaveValue(addDays(todayKst(), 2));

    const end = screen.getByLabelText("종료일");
    await userEvent.clear(end);
    await userEvent.type(end, todayKst());
    rerender(<TripSetupForm onSubmit={onSubmit} defaultDays={4} />);
    expect(end).toHaveValue(todayKst());
  });
});
