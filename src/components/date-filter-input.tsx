// 필터용 날짜 입력 — 키보드로 칠 때 생기는 중간 값(24일을 치는 중의 02일 등)을 바로 반영하지 않는다.
// 입력 중인 값은 이 컴포넌트가 들고 있다가, 완성된 날짜가 min 이후일 때만 onCommit으로 넘긴다.
// 반영하지 않은 값은 포커스를 떠날 때 마지막으로 반영한 값으로 되돌린다.
import { useState } from "react";
import { Input } from "@/components/ui/input";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

interface DateFilterInputProps {
  id: string;
  /** 지금 반영된 값 ("" = 비어 있음) */
  value: string;
  /** 고를 수 있는 가장 이른 날짜 "YYYY-MM-DD" */
  min: string;
  /** 완성된 날짜(min 이후) 또는 "" (비움) */
  onCommit: (date: string) => void;
  className?: string;
}

export function DateFilterInput({ id, value, min, onCommit, className }: DateFilterInputProps) {
  const [text, setText] = useState(value);
  const [synced, setSynced] = useState(value);
  // 바깥 값(URL 등)이 바뀌면 입력 중이던 값도 맞춘다 — 렌더 중 동기화 (Effect 대신)
  if (value !== synced) {
    setSynced(value);
    setText(value);
  }
  return (
    <Input
      id={id}
      type="date"
      min={min}
      className={className}
      value={text}
      onChange={(e) => {
        const v = e.target.value;
        setText(v);
        if (v === "" || (DATE_RE.test(v) && v >= min)) onCommit(v);
      }}
      onBlur={() => {
        if (text !== value) setText(value);
      }}
    />
  );
}
