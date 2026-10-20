// 초안 저장과 공개에 서로 다른 검사를 쓰는 폼 resolver — 임시저장은 불완전 정보도 허용한다 (기능명세 §9).
// 누른 버튼에 따라 mode를 바꾼 뒤 handleSubmit을 부른다.
import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useRef } from "react";
import type { FieldValues, Resolver } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import type { SaveMode } from "../lib/content-form";

export function useSaveModeResolver<V extends FieldValues>(
  publishSchema: z.ZodType<V>,
  draftSchema: z.ZodType<V>,
) {
  const mode = useRef<SaveMode>("publish");
  const resolver = useMemo<Resolver<V>>(() => {
    const byMode = {
      publish: zodResolver(publishSchema as never) as unknown as Resolver<V>,
      draft: zodResolver(draftSchema as never) as unknown as Resolver<V>,
    };
    return (values, context, options) => byMode[mode.current](values, context, options);
  }, [publishSchema, draftSchema]);
  return { resolver, mode };
}

/** 검사에 걸렸을 때 — 버튼이 아무 반응 없어 보이지 않게 알린다 */
export function notifyInvalid() {
  toast.error("입력을 확인해 주세요. 빨간 안내가 있는 칸을 고쳐야 저장돼요.");
}
