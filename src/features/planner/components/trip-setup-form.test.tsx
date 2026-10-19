import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
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
});
