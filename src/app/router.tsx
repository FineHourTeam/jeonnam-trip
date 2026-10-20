// 모든 라우트는 이 파일 한 곳에 정의한다 (rules.md § 라우팅). 페이지는 라우트 단위로 lazy 로드.
// 각 기능은 자기 features/<기능>/pages/*.tsx 파일만 채운다 — 이 파일은 경로를 새로 만들 때만 고친다.
import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter } from "react-router";
import { AppLayout } from "./app-layout";
import { NotFoundPage, RouteErrorPage } from "./error-pages";
import { paths, patterns } from "./paths";
import { ProtectedRoute } from "./protected-route";

const HomePage = lazy(() => import("@/features/explore/pages/home-page"));
const FestivalListPage = lazy(() => import("@/features/festivals/pages/festival-list-page"));
const FestivalDetailPage = lazy(() => import("@/features/festivals/pages/festival-detail-page"));
const PlaceListPage = lazy(() => import("@/features/places/pages/place-list-page"));
const PlaceDetailPage = lazy(() => import("@/features/places/pages/place-detail-page"));
const LibraryPage = lazy(() => import("@/features/library/pages/library-page"));
const SnsNewPage = lazy(() => import("@/features/library/pages/sns-new-page"));
const CreatorListPage = lazy(() => import("@/features/creators/pages/creator-list-page"));
const CreatorDetailPage = lazy(() => import("@/features/creators/pages/creator-detail-page"));
const TripNewPage = lazy(() => import("@/features/planner/pages/trip-new-page"));
const TripEditPage = lazy(() => import("@/features/planner/pages/trip-edit-page"));
const LoginPage = lazy(() => import("@/features/account/pages/login-page"));
const KakaoCallbackPage = lazy(() => import("@/features/account/pages/kakao-callback-page"));
const AccountPage = lazy(() => import("@/features/account/pages/account-page"));
const MyTripsPage = lazy(() => import("@/features/account/pages/my-trips-page"));
const TripSharePage = lazy(() => import("@/features/account/pages/trip-share-page"));
const SharedTripPage = lazy(() => import("@/features/account/pages/shared-trip-page"));
const AdminLayout = lazy(() => import("@/features/admin/pages/admin-layout"));
const AdminHomePage = lazy(() => import("@/features/admin/pages/admin-home-page"));
const AdminListPage = lazy(() => import("@/features/admin/pages/admin-list-page"));
const AdminEditPage = lazy(() => import("@/features/admin/pages/admin-edit-page"));

function page(node: ReactNode) {
  return (
    <Suspense
      fallback={<div className="text-muted-foreground px-4 py-10 text-center">불러오는 중...</div>}
    >
      {node}
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: paths.home, element: page(<HomePage />) },
      { path: paths.festivals, element: page(<FestivalListPage />) },
      { path: patterns.festivalDetail, element: page(<FestivalDetailPage />) },
      { path: paths.places, element: page(<PlaceListPage />) },
      { path: patterns.placeDetail, element: page(<PlaceDetailPage />) },
      { path: paths.library, element: page(<LibraryPage />) },
      { path: paths.snsNew, element: page(<SnsNewPage />) },
      { path: paths.creators, element: page(<CreatorListPage />) },
      { path: patterns.creatorDetail, element: page(<CreatorDetailPage />) },
      // 로그인 전에도 작성 가능 (저장할 때 로그인) — 가드 밖
      { path: paths.tripNew, element: page(<TripNewPage />) },
      { path: patterns.tripEdit, element: page(<TripEditPage />) },
      { path: patterns.sharedTrip, element: page(<SharedTripPage />) },
      { path: paths.login, element: page(<LoginPage />) },
      { path: paths.kakaoCallback, element: page(<KakaoCallbackPage />) },
      {
        element: <ProtectedRoute />,
        children: [
          { path: paths.myTrips, element: page(<MyTripsPage />) },
          { path: patterns.tripShare, element: page(<TripSharePage />) },
          { path: paths.account, element: page(<AccountPage />) },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
  {
    // 관리자 영역 — 사용자 앱 셸 없이 자체 레이아웃. 관리자 여부 확인은 AdminLayout(게이트)이 한다
    element: <ProtectedRoute />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        path: paths.admin,
        element: page(<AdminLayout />),
        children: [
          { index: true, element: page(<AdminHomePage />) },
          { path: patterns.adminList, element: page(<AdminListPage />) },
          { path: patterns.adminNew, element: page(<AdminEditPage />) },
          { path: patterns.adminEdit, element: page(<AdminEditPage />) },
        ],
      },
    ],
  },
]);
