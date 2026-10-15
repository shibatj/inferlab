# 05 — แบบฝึกหัดตรวจอัตโนมัติ และ E2E Tests (M5)

M5 ปิดโปรเจกต์ด้วยสามเรื่อง: แบบฝึกหัดที่ตรวจด้วย test case (Q12, Q24), E2E tests ด้วย Playwright (Q31) และการ deploy (Q35, Q37)

```
src/exercises/
├── grader.ts            ตรวจกฎของผู้เรียนกับ test case
├── exercises.ts         โจทย์ 4 ข้อ (visible + hidden tests)
└── exercises.test.ts    เฉลย + test ของ grader (ไม่ถูก bundle ไปเบราว์เซอร์)
e2e/app.spec.ts          Playwright: เส้นทางหลักของผู้ใช้
playwright.config.ts
```

---

## 1. Grader ทำงานอย่างไร

ผู้เรียนเขียน **เฉพาะกฎ** แต่ละ test case ใส่ facts ของตัวเองเข้าไป แล้วตรวจข้อสรุป:

```
for test in tests + hidden:
    kb = parse(learnerRules + facts ของ test)       ← KB ใหม่ทุก test
    forward:  รัน forwardChain แล้วดู working memory ตอนจบ
    backward: รัน backwardChain แยกทีละ atom ที่คาดหวัง
    แต่ละ atom: true → CF > 0.2 | false → CF ≤ 0.2 | ตัวเลข n → |CF − n| ≤ 0.05
```

การตัดสินใจที่ควรรู้:

- **ห้ามประกาศ `fact`** — ถ้าผู้เรียนเขียน `fact tiger` ไว้ test "ต้องสรุป tiger ได้" ก็ผ่านโดยไม่ต้องเขียนกฎ grader จึงปฏิเสธพร้อมบอกบรรทัด
- **ต่อ facts ไว้หลังกฎ** — เลขบรรทัดของ error จึงตรงกับ editor เสมอ
- **KB ใหม่ทุก test** — test ไม่ปนกัน (ผลจาก test ก่อนไม่ค้างไปถึง test ถัดไป)
- **ทำไม forward กับ backward ให้ผลเหมือนกันได้?** สำหรับข้อที่ไม่มี CF ผลตอนจบของ forward ไม่ขึ้นกับกลยุทธ์ (ระบบ monotonic: กฎที่ fire ได้ fire หมดทุกตัวในที่สุด) ส่วนข้อที่มี CF ใช้ backward เพราะไม่ขึ้นกับลำดับการ fire (ADR 0004)
- **ยอมคลาดเคลื่อน ±0.05** และบวก `1e-9` กันปัญหา floating point เช่น 0.8 + 0.05 ที่อาจได้ 0.8500000000000001

## 2. Hidden tests

แต่ละโจทย์มี test ที่เห็น (แสดง facts, ค่าที่คาดหวัง และค่าที่ได้) กับ **hidden test** ที่บอกแค่ผ่าน/ไม่ผ่าน จุดประสงค์คือกัน **overfitting** — กฎที่เขียนให้ตรงกับ test ที่เห็นแต่ไม่ได้สะท้อนความรู้จริง ตัวอย่างใน screenshot ของ README: ผู้เรียนลืมกฎ "มีหลักประกันก็อนุมานได้" test ที่เห็นผ่านหมด แต่ hidden test 1 ไม่ผ่าน

> แนวคิดเดียวกับการแบ่ง training / test set ใน machine learning — คะแนนบนข้อมูลที่ไม่เคยเห็นบอกความสามารถจริงได้ดีกว่า

**ข้อจำกัดที่ต้องรู้:** ทุกอย่างรันในเบราว์เซอร์ คนที่เปิด DevTools จะเห็น hidden test ได้ ยอมรับได้เพราะเป็นการฝึกฝนตัวเอง ไม่ใช่การสอบเก็บคะแนน (ถ้าต้องการกันจริงต้องตรวจที่ server ซึ่งขัดกับเป้า 0 บาทและ static ทั้งหมด)

## 3. Test ของโจทย์เอง

`exercises.test.ts` เก็บ **เฉลย** ไว้ (ไม่ได้ import จากโค้ดของแอป จึงไม่ถูก bundle) และตรวจทุกโจทย์ว่า:

1. เฉลยผ่าน **ทุก** test รวม hidden — โจทย์แก้ได้จริง
2. โค้ดตั้งต้น parse ผ่านแต่ **ยังไม่ผ่าน** — ผู้เรียนต้องลงมือ
3. facts ในทุก test case เขียนถูกไวยากรณ์
4. มีทั้ง visible และ hidden test

ตัวอย่างคุณค่าของข้อ 1: ถ้าใครแก้ test case ในอนาคตจนขัดกับนโยบายในโจทย์ test นี้จะพังทันที

## 4. E2E tests (Playwright)

Unit test ตรวจ logic แต่ไม่รู้ว่าปุ่มกดได้จริง, หน้าโหลดได้, หรือ React ไม่พัง E2E เปิดเบราว์เซอร์จริงกับ **production build** แล้วทำแบบผู้ใช้:

| Test | ตรวจอะไร |
|---|---|
| redirect | `/` → `/th` และหลังกดสลับภาษา `/` → `/en` (cookie + `next.config` redirects) |
| forward | รันจนจบ, ข้อความ quiescence, คลิก fact แล้วเห็น HOW |
| backward | ตัวอย่างรถพิสูจน์ `battery_dead` ได้ CF 0.9 |
| syntax error | engine ไม่รัน และแสดง error พร้อมข้อความ |
| lessons | ตอบ quiz ถูก แล้วหน้ารายการบทแสดง 1 / 3 |
| exercises | เฉลยถูกได้ "ผ่านทุก test" และหน้ารายการแสดง "Solved" / ประกาศ fact ถูกปฏิเสธ |
| touch | อุปกรณ์จอสัมผัสเห็นหน้าแจ้งเตือนแทนแอป |

รายละเอียดที่ควรรู้:
- **พิมพ์ลง CodeMirror** — editor ไม่ใช่ `<textarea>` ใช้ `fill()` ไม่ได้ จึงคลิกแล้วกด `Ctrl+A`, `Delete` และใช้ `keyboard.insertText` (เร็วกว่าพิมพ์ทีละตัว)
- **จำลองมือถือ** — preset "iPhone 13" ของ Playwright บังคับให้ใช้ WebKit ซึ่งสลับในกลุ่ม test ไม่ได้ เราจึงดึงเฉพาะ viewport/touch/isMobile มาใช้กับ Chromium
- **webServer** ใน config เปิด `next start` ให้เอง และ CI รัน `npx playwright install --with-deps chromium` ก่อน — ทั้งหมดฟรีบน GitHub Actions สำหรับ repo สาธารณะ

## 5. Security audit

`npm audit` ฝั่ง production: **0 ช่องโหว่** ฝั่ง dev:
- **อัปเกรด vitest 3 → 5** แก้ช่องโหว่ critical ของ `tinypool` (ต้องอัปเกรด `@types/node` เป็น 24 ตาม peer dependency ด้วย) test ทั้งหมดผ่านโดยไม่ต้องแก้
- **เหลือ high 5 รายการ** ในสาย `braces`/`micromatch` ผ่าน `eslint-config-next` — ยังไม่มีทางแก้ที่ไม่ทำให้ลิงก์ของ Next พัง และเป็นเครื่องมือ lint ตอนพัฒนาเท่านั้น ไม่ถูกส่งไปกับเว็บ — ควรเช็กอีกครั้งเมื่อ Next ออกเวอร์ชันใหม่

## 6. คำถามทดสอบตัวเอง

1. ถ้า grader ใช้ KB เดียวกันต่อเนื่องทุก test (ไม่สร้างใหม่) จะเกิดปัญหาอะไร?
2. ทำไมโจทย์ "รวมหลักฐานด้วย CF" ใช้ backward chaining ไม่ใช่ forward?
3. hidden test กันอะไรได้ และกันอะไรไม่ได้?
4. ถ้าลบเงื่อนไข "ห้ามประกาศ fact" ออก ผู้เรียนจะ "โกง" โจทย์จำแนกสัตว์ได้อย่างไร? แล้ว hidden test ช่วยกันได้ไหม?
5. ทำไม E2E ต้องรันกับ production build ไม่ใช่ dev server?
