// 인증 상태 훅 — 컴포넌트 파일(protected-route.tsx)과 분리 (react-refresh 규칙:
// 컴포넌트 파일은 컴포넌트만 export).
// 핵심: Firebase Auth 초기화는 비동기다 — "확인 중" 상태를 기다리지 않으면
// 새로고침마다 로그인 화면이 번쩍인다 (unknown-unknowns #12, #35).
import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth } from "../lib/firebase";

export type AuthState =
  { status: "loading" } | { status: "authed"; user: User } | { status: "guest" };

export function useAuthState(): AuthState {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setState(user ? { status: "authed", user } : { status: "guest" });
    });
    return unsubscribe; // cleanup 누락 = 구독 누수 (unknown-unknowns #6)
  }, []);

  return state;
}
