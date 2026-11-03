// S07 SNS 링크 폼 값·검사 — 화면, 로그인 왕복 보존 스토어, 저장 입력 변환이 같은 모양을 쓴다.
import { z } from "zod";
import i18n, { type resources } from "@/lib/i18n";
import { isSigunCode, type CustomPlace, type SigunCode, type SnsLink } from "@/shared/domain";
import type { LinkTarget, SnsLinkInput } from "../api/library-api";
import {
  MAX_LINKED_PLACES,
  MAX_MEMO_LENGTH,
  MAX_TAGS,
  MAX_TAG_LENGTH,
  MAX_URL_LENGTH,
  formatTags,
  normalizeSnsUrl,
  parseTags,
} from "./library";

/** 폼에서 연결한 장소 한 곳 — 이름은 표시용 (null = 공개가 끝나 볼 수 없는 장소) */
export type LinkedPlaceDraft =
  | { kind: "place"; placeId: string; name: string | null; sigun: SigunCode | null }
  | { kind: "custom"; customPlaceId: string; name: string | null }
  | { kind: "new"; key: string; place: Omit<CustomPlace, "id" | "createdAt"> };

export function draftKey(d: LinkedPlaceDraft): string {
  if (d.kind === "place") return `place:${d.placeId}`;
  if (d.kind === "custom") return `custom:${d.customPlaceId}`;
  return `new:${d.key}`;
}

export const NO_SIGUN = "none";

// 검사 메시지는 보여 줄 때의 언어로 — 스키마가 모듈 상수라 메시지를 콜백(zod v4 error)으로 넘긴다
type ValidationKey = keyof (typeof resources)["ko"]["library"]["validation"];
export const validationMsg = (key: ValidationKey, max?: number) => ({
  error: () => i18n.t(`validation.${key}`, { ns: "library", max }),
});

/** 쉼표로 나눈 태그 입력 — S07 링크와 S06 태그·메모 고치기가 같은 검사를 쓴다 */
export const tagsSchema = z
  .string()
  .refine((v) => parseTags(v).length <= MAX_TAGS, validationMsg("tagsMax", MAX_TAGS))
  .refine(
    (v) => parseTags(v).every((t) => t.length <= MAX_TAG_LENGTH),
    validationMsg("tagLength", MAX_TAG_LENGTH),
  );

export const memoSchema = z
  .string()
  .max(MAX_MEMO_LENGTH, validationMsg("memoMax", MAX_MEMO_LENGTH));

export const snsFormSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, validationMsg("urlRequired"))
    .max(MAX_URL_LENGTH, validationMsg("urlMax", MAX_URL_LENGTH))
    .refine((v) => normalizeSnsUrl(v) !== null, validationMsg("urlFormat")),
  places: z
    .array(z.custom<LinkedPlaceDraft>())
    .max(MAX_LINKED_PLACES, validationMsg("placesMax", MAX_LINKED_PLACES)),
  sigun: z.string(),
  tags: tagsSchema,
  memo: memoSchema,
});

export type SnsFormValues = z.infer<typeof snsFormSchema>;

export const EMPTY_SNS_FORM: SnsFormValues = {
  url: "",
  places: [],
  sigun: NO_SIGUN,
  tags: "",
  memo: "",
};

/** 저장한 링크 → 편집 폼 값. lookup이 null이면 공개가 끝났거나 지워진 장소 */
export function formOfLink(
  link: SnsLink,
  lookup: (ref: SnsLink["linked"][number]) => { name: string; sigun: SigunCode | null } | null,
): SnsFormValues {
  return {
    url: link.url,
    places: link.linked.map((r) => {
      const found = lookup(r);
      return r.kind === "place"
        ? {
            kind: "place",
            placeId: r.placeId,
            name: found?.name ?? null,
            sigun: found?.sigun ?? null,
          }
        : { kind: "custom", customPlaceId: r.customPlaceId, name: found?.name ?? null };
    }),
    sigun: link.sigun ?? NO_SIGUN,
    tags: formatTags(link.tags),
    memo: link.memo,
  };
}

function targetOf(d: LinkedPlaceDraft): LinkTarget {
  if (d.kind === "place") return { kind: "place", placeId: d.placeId };
  if (d.kind === "custom") return { kind: "custom", customPlaceId: d.customPlaceId };
  return { kind: "new", place: d.place };
}

/**
 * 이미 보관한 링크에 새로 쓴 내용을 더한다 — 장소·태그는 합치고, 메모는 줄을 바꿔 잇는다.
 * 주소와 지역은 보관한 링크를 따른다. 합쳐서 장소·태그·메모 한도를 넘으면 null (사용자가 직접 고친다).
 */
export function mergeLinkInput(existing: SnsLink, add: SnsLinkInput): SnsLinkInput | null {
  const targets: LinkTarget[] = existing.linked.map((r) =>
    r.kind === "place"
      ? { kind: "place", placeId: r.placeId }
      : { kind: "custom", customPlaceId: r.customPlaceId },
  );
  const key = (t: LinkTarget) =>
    t.kind === "place"
      ? `place:${t.placeId}`
      : t.kind === "custom"
        ? `custom:${t.customPlaceId}`
        : null;
  const known = new Set(targets.map(key));
  for (const t of add.targets) if (!known.has(key(t))) targets.push(t);
  const tags = [...new Set([...existing.tags, ...add.tags])];
  const memo =
    !add.memo || existing.memo.includes(add.memo)
      ? existing.memo
      : [existing.memo, add.memo].filter(Boolean).join("\n");
  if (targets.length > MAX_LINKED_PLACES || tags.length > MAX_TAGS || memo.length > MAX_MEMO_LENGTH)
    return null;
  return { url: existing.url, sigun: existing.sigun ?? add.sigun, tags, memo, targets };
}

/** 검사를 통과한 폼 값 → 저장 입력 */
export function linkInputOf(v: SnsFormValues): SnsLinkInput {
  return {
    url: normalizeSnsUrl(v.url) ?? v.url.trim(),
    sigun: isSigunCode(v.sigun) ? v.sigun : null,
    tags: parseTags(v.tags),
    memo: v.memo.trim(),
    targets: v.places.map(targetOf),
  };
}
