// 라우트 경로 단일 출처 — 컴포넌트에서 '/detail/3' 문자열 하드코딩 금지 (rules.md § 라우팅).
// 이동은 navigate(paths.noticeDetail(id)) 형태로만. 라우터 정의(router.tsx)도 이 상수를 쓴다.
export const paths = {
  home: "/",
  login: "/login",
  // 예시 — 기능 추가 시 이 아래에 등록:
  // notices: "/notices",
  // noticeDetail: (id: string) => `/notices/${id}`,
  notFound: "*",
} as const;
