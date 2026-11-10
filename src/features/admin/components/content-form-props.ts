import type { ContentStatus } from "@/shared/domain";
import type { ContentAction } from "../hooks/use-admin";

/** 종류별 편집 폼의 공통 props — 폼은 값 검증·변환만 하고 저장은 페이지가 한다 */
export interface ContentFormProps<T, V> {
  contentId: string;
  initial: V;
  /** 기존 본문 (새 콘텐츠면 없음) */
  base?: T;
  status: ContentStatus | null;
  hasDraft: boolean;
  pending: ContentAction | null;
  onAction: (action: ContentAction, content: T) => void;
}
