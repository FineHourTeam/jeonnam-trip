// 관리자 영역 레이아웃 겸 권한 게이트 — admins/{uid} 확인은 admin feature 작업에서 구현한다.
// 구현 전까지는 관리자 화면을 열지 않는다 (숨김만으로 접근 제어가 끝나지 않으며 Firestore 규칙이 실제 차단).
import { PagePlaceholder } from "@/components/page-placeholder";

export default function AdminLayout() {
  return <PagePlaceholder title="운영 관리" />;
}
