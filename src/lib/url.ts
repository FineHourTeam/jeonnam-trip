// 외부 URL 안전 처리 — 사용자·운영자가 입력한 URL을 href에 그대로 넣지 않는다 (javascript: URI 차단).
// rules.md § UI 금지: new URL() 파싱 후 http/https만 허용.

/** http/https면 정규화한 URL, 아니면 null */
export function safeHref(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw.trim());
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export type SnsPlatform = "instagram" | "youtube" | "blog" | "other";

export const SNS_PLATFORM_LABEL: Record<SnsPlatform, string> = {
  instagram: "인스타그램",
  youtube: "유튜브",
  blog: "블로그",
  other: "기타 링크",
};

/** 호스트로 플랫폼 추정 — 표시용일 뿐 원문 내용을 가져오지 않는다 */
export function detectSnsPlatform(href: string): SnsPlatform {
  const host = new URL(href).hostname.replace(/^www\.|^m\./, "");
  if (host === "instagram.com" || host.endsWith(".instagram.com")) return "instagram";
  if (host === "youtube.com" || host === "youtu.be" || host.endsWith(".youtube.com"))
    return "youtube";
  if (host.includes("blog") || host === "brunch.co.kr" || host.endsWith("tistory.com"))
    return "blog";
  return "other";
}

export const MAX_URL_LENGTH = 2000;

/** SNS 링크 입력 검사 — 허용 형식(http/https)과 길이 (기능명세 §4-1) */
export function validateSnsUrl(
  raw: string,
): { ok: true; href: string } | { ok: false; message: string } {
  const value = raw.trim();
  if (!value) return { ok: false, message: "링크를 붙여 넣어 주세요." };
  if (value.length > MAX_URL_LENGTH)
    return { ok: false, message: "링크가 너무 길어요. 2,000자 이하로 넣어 주세요." };
  const href = safeHref(value) ?? safeHref(`https://${value}`);
  if (!href || !/^https?:\/\/[^/]+\.[^/]+/.test(href)) {
    return { ok: false, message: "링크 형식이 아니에요. https://로 시작하는 주소를 넣어 주세요." };
  }
  return { ok: true, href };
}
