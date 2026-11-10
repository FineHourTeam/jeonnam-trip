// Firebase 초기화 단일 지점 — 앱 어디서도 initializeApp을 재호출하지 않는다.
// 모듈러 SDK(v12)만 사용. 안 쓰는 서비스는 import 자체를 하지 말 것 (트리셰이킹).
// 서비스 접근은 반드시 이 파일의 export 경유 (rules.md § Firebase).
import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, initializeFirestore } from "firebase/firestore";
import { connectStorageEmulator, getStorage } from "firebase/storage";
import { env } from "./env";

// Firebase 웹 config는 시크릿이 아니다 — 보안은 Security Rules + App Check가 담당.
const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
});

export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  // 도메인 타입에 선택 필드가 많다 — undefined 필드가 있어도 쓰기가 실패하지 않게
  ignoreUndefinedProperties: true,
  // 웹 오프라인 캐시는 기본 OFF — 필요해지면 persistentLocalCache 옵션을 여기서만 결정
  // (unknown-unknowns #3). 멀티탭이면 persistentMultipleTabManager까지.
});
export const storage = getStorage(app);

// 로컬 개발은 에뮬레이터가 기본 — 실 프로젝트 데이터를 건드리지 않는다.
// VITE_USE_EMULATORS=false 로 끌 수 있다 (예: 스테이징 데이터 확인 시).
if (import.meta.env.DEV && env.VITE_USE_EMULATORS) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectStorageEmulator(storage, "127.0.0.1", 9199);
}
