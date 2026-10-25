// ESLint 9 flat config 표준 예시 — 프로젝트 eslint.config.js를 이 기준으로 맞출 것.
// 구성: typescript-eslint(strictTypeChecked) + react-hooks(v6, 컴파일러 규칙 포함) + jsx-a11y.
// 포매팅은 Prettier가 담당 — 스타일 규칙을 ESLint에 넣지 않는다.
import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import jsxA11y from "eslint-plugin-jsx-a11y";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  // e2e·설정 파일은 앱 tsconfig(include: src) 밖이라 type-aware 파서가 못 찾는다.
  // E2E 스펙은 Playwright가 실행 시 자체 타입체크하므로 메인 lint에서 제외 (표준 패턴).
  {
    ignores: [
      "dist",
      "coverage",
      "functions",
      "e2e",
      "playwright.config.ts",
      "playwright.e2e.config.ts",
      "*.config.js",
      ".claude/worktrees",
    ],
  },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
      reactHooks.configs["recommended-latest"],
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "react-refresh": reactRefresh,
    },
    rules: {
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      // 기본 아이콘 팩 금지 — 아이콘은 @/components/icons 프로젝트 세트만 (rules.md § 아이콘 규칙)
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex:
                "^(lucide-react|lucide|react-icons(/.*)?|@heroicons/react(/.*)?|@tabler/icons-react|@phosphor-icons/react|phosphor-react|@radix-ui/react-icons|react-feather|@mui/icons-material(/.*)?|iconsax-react|@iconify/react|react-bootstrap-icons|@fortawesome/.*|@remixicon/react|@hugeicons/react)$",
              message:
                "기본 아이콘 팩 대신 @/components/icons의 프로젝트 아이콘을 쓴다. 없으면 src/components/icons/README.md대로 새로 그린다.",
            },
          ],
        },
      ],
      // any 차단 — unknown + 좁히기 (rules.md § UI 금지)
      // 구조분해로 prop을 빼낼 때(rest 형제) 쓰지 않는 변수는 허용 — shadcn 래퍼에서 흔한 패턴
      "@typescript-eslint/no-unused-vars": [
        "error",
        { ignoreRestSiblings: true, argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      // @ts-ignore 금지, @ts-expect-error는 사유 필수
      "@typescript-eslint/ban-ts-comment": [
        "error",
        { "ts-expect-error": "allow-with-description" },
      ],
      // await 안 한 프로미스의 에러는 잡을 곳이 없다 (unknown-unknowns #40)
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      // console 잔존 방지 — warn/error만 허용
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
  // 테스트 파일은 일부 완화
  {
    files: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
);
