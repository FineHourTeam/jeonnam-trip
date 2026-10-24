// E2E 시작 전: 에뮬레이터 데이터를 비우고 테스트 계정·샘플 콘텐츠를 다시 넣는다 (매번 같은 출발점).
import { execFileSync } from "node:child_process";

const AUTH = "127.0.0.1:19099";
const FIRESTORE = "127.0.0.1:18080";
const PROJECT = "jeonnam-trip";

export default async function globalSetup() {
  await fetch(`http://${FIRESTORE}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: "DELETE" });
  await fetch(`http://${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: "DELETE" });
  const env = {
    ...process.env,
    FIREBASE_AUTH_EMULATOR_HOST: AUTH,
    FIRESTORE_EMULATOR_HOST: FIRESTORE,
    VITE_FIREBASE_PROJECT_ID: PROJECT,
  };
  execFileSync(process.execPath, ["scripts/seed-test-accounts.mjs"], { env, stdio: "inherit" });
  execFileSync(process.execPath, ["scripts/seed-sample-content.mjs"], { env, stdio: "inherit" });
}
