// 기능 화면이 아직 연결되지 않은 라우트용 임시 화면 — 각 기능 작업이 자기 페이지 파일을 채우면 사라진다.
// 버튼·가짜 데이터 없이 "준비 중"만 알린다 (동작 없는 UI 금지 규칙).
export function PagePlaceholder({ title }: { title: string }) {
  return (
    <section className="mx-auto flex max-w-screen-md flex-col gap-2 px-4 py-10">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-muted-foreground">이 화면은 준비 중이에요.</p>
    </section>
  );
}
