// 첫 화면 예시 장면 — 브레이크타임에 걸린 일정이 순서만 바꿔 풀리는 모습을 보여 준다 (서비스 핵심: 영업조건 충돌을 미리 잡는다).
// 실제 데이터가 아닌 예시라 "예시 일정"으로 표시한다. 처음 한 번은 저절로 순서를 바꾸고, 움직임 줄이기 설정이면 버튼으로만 바꾼다.
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { SuccessIcon, WarningIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { transitions } from "@/lib/motion";
import { cn } from "@/lib/utils";

const AUTO_FIX_MS = 2500;

interface Stop {
  name: string;
  time: string;
  note?: { ok: boolean; text: string };
}

const BEFORE: Stop[] = [
  { name: "유달산 전망대", time: "10:00" },
  { name: "바다 앞 카페", time: "12:00" },
  {
    name: "낙지 맛집",
    time: "15:10",
    note: { ok: false, text: "브레이크타임(15:00~17:00)에 도착해요" },
  },
];

const AFTER: Stop[] = [
  { name: "유달산 전망대", time: "10:00" },
  { name: "낙지 맛집", time: "12:00", note: { ok: true, text: "영업시간 안에 도착해요" } },
  { name: "바다 앞 카페", time: "13:40" },
];

export function ScheduleDemo({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion() ?? false;
  const [fixed, setFixed] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (reduceMotion || touched) return;
    const timer = window.setTimeout(() => {
      setFixed(true);
    }, AUTO_FIX_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [reduceMotion, touched]);

  const stops = fixed ? AFTER : BEFORE;

  return (
    <div className={cn("bg-card text-card-foreground rounded-xl p-4 shadow-lg", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-semibold">목포 하루 일정</p>
        <p className="text-muted-foreground text-xs">예시 일정</p>
      </div>
      <ol className="mt-3 flex flex-col gap-2">
        {stops.map((s, i) => (
          <motion.li
            key={s.name}
            layout={!reduceMotion}
            transition={transitions.base}
            className="border-border flex flex-col gap-1 rounded-lg border p-3"
          >
            <div className="flex items-center gap-3 text-sm">
              <span className="bg-primary text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">{s.name}</span>
              <span className="text-muted-foreground tabular-nums">{s.time} 도착</span>
            </div>
            {s.note && (
              <p
                className={cn(
                  "flex items-center gap-1 text-xs font-medium",
                  s.note.ok ? "text-success" : "text-destructive",
                )}
              >
                {s.note.ok ? <SuccessIcon size="sm" /> : <WarningIcon size="sm" />}
                {s.note.text}
              </p>
            )}
          </motion.li>
        ))}
      </ol>
      <div className="mt-3 flex items-center justify-between gap-2">
        <p aria-live="polite" className="text-sm">
          {fixed ? "순서만 바꿔서 헛걸음 없이 맞췄어요." : "이대로 가면 문 닫힌 가게 앞에 서요."}
        </p>
        <Button
          size="sm"
          variant={fixed ? "outline" : "default"}
          className="shrink-0"
          onClick={() => {
            setTouched(true);
            setFixed(!fixed);
          }}
        >
          {fixed ? "처음으로" : "순서 바꾸기"}
        </Button>
      </div>
    </div>
  );
}
