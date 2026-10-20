// 화면 공용 표기 — 확인일은 "2026. 10. 19." (rules.md § 한국어 카피 — 숫자·날짜), 외부 링크는 http(s)만.

export function formatDotDate(date: string): string {
  const [y = 0, m = 0, d = 0] = date.split("-").map(Number);
  return `${String(y)}. ${String(m)}. ${String(d)}.`;
}

/** http/https 주소만 링크로 쓴다 (javascript: URI 차단) */
export function safeHttpUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}

/** 전화번호 모양일 때만 tel: 링크 */
export function telHref(contact: string): string | null {
  const digits = contact.replace(/[^\d]/g, "");
  return /^[\d\s()-]+$/.test(contact) && digits.length >= 8 ? `tel:${digits}` : null;
}
