// 세 언어 리소스의 키가 서로 맞는지 — 한쪽에만 있는 키는 화면에 키 문자열이나 한국어가 그대로 나온다.
// 영어 복수형(_one/_other)은 같은 키로 본다.
import { describe, expect, it } from "vitest";
import { resources } from "./i18n";

function keys(obj: object, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === "object" && v !== null
      ? keys(v as object, `${prefix}${k}.`)
      : [`${prefix}${k.replace(/_(zero|one|two|few|many|other)$/, "")}`],
  );
}

const sorted = (obj: object) => [...new Set(keys(obj))].sort();

describe("i18n 리소스", () => {
  for (const ns of Object.keys(resources.ko) as (keyof typeof resources.ko)[]) {
    it(`${ns}: en·ja 키가 ko와 같다`, () => {
      expect(sorted(resources.en[ns])).toEqual(sorted(resources.ko[ns]));
      expect(sorted(resources.ja[ns])).toEqual(sorted(resources.ko[ns]));
    });
  }
});
