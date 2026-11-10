import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DateFilterInput } from "./date-filter-input";

function setup(value = "2026-10-20") {
  const onCommit = vi.fn();
  const utils = render(
    <DateFilterInput id="d" value={value} min="2026-10-20" onCommit={onCommit} />,
  );
  const input = screen.getByDisplayValue<HTMLInputElement>(value);
  return { onCommit, input, ...utils };
}

describe("DateFilterInput", () => {
  it("키보드 입력 중의 지난 날짜(24일을 치는 중의 02일)는 반영하지 않고 입력 칸에만 둔다", () => {
    const { onCommit, input } = setup();
    fireEvent.change(input, { target: { value: "2026-10-02" } });
    expect(onCommit).not.toHaveBeenCalled();
    expect(input.value).toBe("2026-10-02");
    fireEvent.change(input, { target: { value: "2026-10-24" } });
    expect(onCommit).toHaveBeenCalledWith("2026-10-24");
  });

  it("비우면 빈 값으로 반영한다", () => {
    const { onCommit, input } = setup();
    fireEvent.change(input, { target: { value: "" } });
    expect(onCommit).toHaveBeenCalledWith("");
  });

  it("반영하지 못한 값은 포커스를 떠날 때 되돌리고, 바깥 값이 바뀌면 따라간다", () => {
    const { input, rerender, onCommit } = setup();
    fireEvent.change(input, { target: { value: "2026-10-02" } });
    fireEvent.blur(input);
    expect(input.value).toBe("2026-10-20");
    rerender(<DateFilterInput id="d" value="2026-11-01" min="2026-10-20" onCommit={onCommit} />);
    expect(input.value).toBe("2026-11-01");
  });
});
