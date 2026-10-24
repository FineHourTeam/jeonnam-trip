import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router";
import { router } from "@/app/router";
import { Toaster } from "@/components/ui/sonner";
import { queryClient } from "@/lib/query-client";
import "@/lib/i18n";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      {/* 위쪽에 띄운다 — 모바일 하단 고정 버튼·탭 바를 가리지 않게 */}
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}

export default App;
