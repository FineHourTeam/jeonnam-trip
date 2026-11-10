// 에뮬레이터에 명명된 테스트 계정을 시드한다 (QA용 안정적 로그인).
// 외부 의존성 없음 — Auth 에뮬레이터 REST API(accounts:signUp)만 사용.
// 실행: npm run seed:test  (에뮬레이터가 떠 있어야 함: firebase emulators:start)
//
// ⚠️ 에뮬레이터 전용. 프로덕션 프로젝트에는 절대 실행되지 않는다 —
//    AUTH_EMULATOR_HOST(로컬)로만 호출하고, 실 엔드포인트로는 붙지 않는다.
//
// 역할(admin/user)은 앱마다 커스텀 클레임 또는 Firestore 프로필로 다르므로 여기선 auth 계정만 만든다.
// 프로필/역할 시드가 필요하면 프로젝트에서 이 스크립트에 Firestore 에뮬레이터 호출을 덧붙인다.

const HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099";
const PROJECT = process.env.VITE_FIREBASE_PROJECT_ID ?? "demo-test";
const PASSWORD = "test123456!"; // test-auth.ts의 TEST_AUTH.password와 일치

// 명명된 시드 계정 — 역할별로 QA가 고정 로그인으로 씀
const ACCOUNTS = [
  { email: "admin@test.local", label: "관리자" },
  { email: "user@test.local", label: "일반 사용자" },
  { email: "user2@test.local", label: "일반 사용자 2 (다계정 시나리오)" },
];

const base = `http://${HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`;

async function seedOne(email, label) {
  const res = await fetch(base, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD, returnSecureToken: true }),
  });
  if (res.ok) {
    console.log(`  ✅ ${email} (${label})`);
    return;
  }
  const body = await res.json().catch(() => ({}));
  const msg = body?.error?.message ?? res.status;
  if (msg === "EMAIL_EXISTS") {
    console.log(`  ⏭️  ${email} (이미 존재)`);
    return;
  }
  console.error(`  ❌ ${email} 실패: ${msg}`);
}

async function main() {
  // 안전장치: 에뮬레이터 호스트가 로컬이 아니면 중단
  if (!/^(127\.0\.0\.1|localhost|0\.0\.0\.0)/.test(HOST)) {
    console.error(
      `거부: FIREBASE_AUTH_EMULATOR_HOST가 로컬이 아님 (${HOST}) — 에뮬레이터 전용 스크립트.`,
    );
    process.exit(1);
  }
  console.log(`🌱 테스트 계정 시드 → ${HOST} (project=${PROJECT})`);
  for (const a of ACCOUNTS) {
    await seedOne(a.email, a.label);
  }
  console.log("\n비밀번호는 모두 동일:", PASSWORD);
  console.log(
    "전화 테스트번호(010########)는 시드 불필요 — 첫 로그인 시 testPhoneSignIn이 자동 생성 (인증번호 123456).",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
