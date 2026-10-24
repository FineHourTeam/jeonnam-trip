// 인증 상태 훅 — 컴포넌트 파일(protected-route.tsx)과 분리 (react-refresh 규칙:
// 컴포넌트 파일은 컴포넌트만 export).
// 핵심: Firebase Auth 초기화는 비동기다 — "확인 중" 상태를 기다리지 않으면
// 새로고침마다 로그인 화면이 번쩍인다 (unknown-unknowns #12, #35).
// 구독은 앱 전체에서 하나만 두고 모든 화면이 같은 값을 읽는다 (화면마다 "확인 중"이 다시 뜨지 않게).
import { onAuthStateChanged, type User } from "firebase/auth";
import { useSyncExternalStore } from "react";
import { auth } from "../lib/firebase";

export type AuthState =
  { status: "loading" } | { status: "authed"; user: User } | { status: "guest" };

let current: AuthState = { status: "loading" };
const listeners = new Set<() => void>();
let started = false;

function subscribe(listener: () => void): () => void {
  if (!started) {
    started = true;
    onAuthStateChanged(auth, (user) => {
      current = user ? { status: "authed", user } : { status: "guest" };
      for (const l of listeners) l();
    });
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useAuthState(): AuthState {
  return useSyncExternalStore(subscribe, () => current);
}
