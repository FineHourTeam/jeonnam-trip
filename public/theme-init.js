// 다크모드 초기화 — localStorage > OS 선호 순서. 첫 페인트 전에 실행되어야 깜빡임이 없다.
// CSP(script-src 'self')가 인라인 스크립트를 막으므로 외부 파일로 두고 index.html에서 동기 로드한다.
(function () {
  var t = localStorage.getItem("theme");
  if (t === "dark" || (!t && matchMedia("(prefers-color-scheme: dark)").matches)) {
    document.documentElement.classList.add("dark");
  }
})();
