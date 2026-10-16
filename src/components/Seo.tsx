// 라우트별 SEO — React 19 네이티브 document metadata (react-helmet 불필요).
// 렌더된 <title>/<meta>를 React가 자동으로 <head>로 호이스트한다. 라우트 컴포넌트 최상단에서 한 줄:
//   <Seo title="공지사항" description="..." />
// 인증 뒤 화면은 noindex 권장. index.html의 기본 메타는 폴백(첫 페인트·크롤러), 라우트별은 이걸로 덮는다.

// 서비스명 — 설치 시 bootstrap이 머물전남.을 실제 제품명으로 치환한다.
const SITE_NAME = "머물전남.";

interface SeoProps {
  /** 페이지 제목 (서비스명은 자동으로 접미) */
  title: string;
  description?: string;
  /** OG 이미지 — 카카오톡/슬랙 미리보기용, 반드시 절대 URL */
  image?: string;
  /** 검색엔진 색인 제외 (인증 뒤 화면·비공개 페이지) */
  noindex?: boolean;
}

export function Seo({ title, description, image, noindex }: SeoProps) {
  const fullTitle = `${title} · ${SITE_NAME}`;
  return (
    <>
      <title>{fullTitle}</title>
      {description ? <meta name="description" content={description} /> : null}
      {noindex ? <meta name="robots" content="noindex, nofollow" /> : null}
      <meta property="og:title" content={fullTitle} />
      {description ? <meta property="og:description" content={description} /> : null}
      {image ? <meta property="og:image" content={image} /> : null}
    </>
  );
}
