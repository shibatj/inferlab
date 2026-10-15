# 03 — Playground UI (M3)

M1–M2 สร้าง engine ที่คืน **trace ครบทั้งหมด** M3 คือการเอา trace นั้นมา "เล่นซ้ำ" ให้เห็นทีละขั้นบนหน้าเว็บ เหตุผลของการตัดสินใจหลักอยู่ใน [ADR 0006](../adr/0006-static-ui-replaying-traces.md)

```
src/
├── app/[lang]/            หน้าเว็บ (Server Components) — /th, /en
│   ├── layout.tsx         <html lang>, ฟอนต์, สคริปต์ธีม, หน้าแจ้งเตือนจอสัมผัส
│   ├── page.tsx           หน้าแรก
│   └── playground/        หน้า playground
├── components/
│   ├── Header.tsx, LangSwitch.tsx, ThemeToggle.tsx
│   └── playground/        Client Components: Playground, RuleEditor, ForwardView, BackwardView
├── playground/            logic ล้วน (ไม่มี React) — มี unit test ทั้งหมด
│   ├── examples.ts        ตัวอย่าง KB 3 ชุด
│   ├── replay.ts          memoryAt, treeStateAt
│   ├── explain.ts         howForward, whyPath
│   └── layout.ts          layoutTree
└── i18n/                  dictionary ไทย/อังกฤษ
```

---

## 1. หลักการออกแบบ: replay ไม่ใช่ re-run

Engine เป็น **pure function**: รับ KB → คืน trace ทั้งหมด (forward: `steps[]`, backward: `tree` + `steps[]` ของ open/close) UI จึงไม่ต้องรัน engine ทีละขั้นเลย แค่เก็บตัวเลข **`k` = แสดงไปแล้วกี่ขั้น**

| ปุ่ม | ทำอะไรกับ `k` |
|---|---|
| ทีละขั้น | `k + 1` |
| ย้อน | `k − 1` |
| รันจนจบ | `k = total` |
| รีเซ็ต | `k = 0` |

ทุกสิ่งบนจอคำนวณจาก `(trace, k)`:

- **Working memory ณ ขั้นที่ k** — `memoryAt(kb, steps, k)`: เริ่มจาก facts ตั้งต้น แล้ว apply `steps[0..k)` ตามลำดับ (ใช้ `cfAfter` ของแต่ละ step)
- **ต้นไม้ ณ ขั้นที่ k** — `treeStateAt(steps, k)`: node ไหน `open` แล้ว (มองเห็น) node ไหน `close` แล้ว (รู้ผล)

ข้อดี: "ย้อน" ได้ฟรีและแม่นยำ 100% เพราะไม่มีอะไรต้อง undo — เทียบกับถ้าเราให้ engine เดินทีละขั้นแบบมี state เราจะต้องเก็บ snapshot ทุกขั้นหรือเขียน undo เอง ข้อเสีย: KB ใหญ่มาก ๆ จะคำนวณ trace ทั้งหมดก่อนแสดงขั้นแรก — สำหรับ KB ขนาดสอนใช้เวลาไม่ถึงมิลลิวินาที

## 2. HOW และ WHY

### HOW (forward) — `howForward`

"fact นี้ได้มาอย่างไร?" → หา step ที่ `conclusion` เป็น fact นั้น แล้วอธิบาย premise ของกฎแต่ละตัวต่อแบบเรียกซ้ำ

**ทำไมไม่วนไม่รู้จบ** แม้มีกฎวน (`a→b`, `b→a`)? เพราะ premise ของกฎที่ fire ใน step ที่ i ต้อง **มีอยู่แล้วก่อน step i** การเรียกซ้ำจึงดูเฉพาะ step ที่ < i — ดัชนีลดลงเรื่อย ๆ ต้องหยุดที่ 0 (เหมือนการพิสูจน์ termination ด้วย well-founded ordering) และเพราะรับพารามิเตอร์ `before = k` HOW จึงอธิบาย "ณ ขั้นที่กำลังดู" ได้ ไม่ใช่ของตอนจบ

### WHY (backward) — `whyPath`

ตาม ADR 0003 WHY คือ "ทำไมต้องพิสูจน์ node นี้" → หาเส้นทางจาก root ลงไปถึง node (DFS + backtrack) แล้วอ่านกลับขึ้นมา: `goal ← rule ← parent goal ← …` แต่ละคู่แปลเป็นประโยค "ต้องพิสูจน์ X เพราะกฎ R ต้องใช้ เพื่อพิสูจน์ Y"

### HOW (backward)

ไม่ต้องมีฟังก์ชันพิเศษ: goal node มี `factCf` และ `rules[]` ที่บอก `fired` / `contribution` อยู่แล้ว UI แค่แสดงรายการหลักฐานที่ถูกรวม

## 3. วาด AND/OR tree — `layoutTree`

React Flow วาด node ตามพิกัดที่เราให้ เราจึงต้องคำนวณ layout เอง ใช้ **tidy tree แบบง่าย**:

1. เดิน DFS จากซ้ายไปขวา
2. **Leaf** ได้คอลัมน์ถัดไป (0, 1, 2, …) — ไม่มี leaf ไหนแชร์คอลัมน์
3. **Parent** อยู่กึ่งกลางระหว่างลูกตัวแรกกับตัวสุดท้าย
4. แถว = ความลึก

เพราะ leaf ทุกตัวมีคอลัมน์ของตัวเอง subtree จึงไม่มีทางทับกัน (มี test ตรวจว่าไม่มีสอง node อยู่ตำแหน่งเดียวกัน) ข้อเสียคือต้นไม้กว้างกว่าอัลกอริทึมแบบ Reingold–Tilford ที่บีบ subtree เข้าหากัน แต่โค้ดสั้นกว่ามาก (~20 บรรทัด) และไม่ต้องพึ่ง library

ตอน step ทีละขั้น ต้นไม้งอกขึ้นเรื่อย ๆ — component `FitOnGrow` สั่ง `fitView` ใหม่ทุกครั้งที่จำนวน node เปลี่ยน โดยจำกัด `maxZoom: 1.1` ไม่ให้ต้นไม้เล็ก ๆ ถูกขยายจนใหญ่เกิน

## 4. Editor — CodeMirror 6

- **Syntax highlighting**: ใช้ `StreamLanguage` (tokenizer ทีละบรรทัดแบบง่าย) — แค่ระบายสี ไม่ได้ตรวจไวยากรณ์
- **ตรวจ error**: `linter` เรียก **parser ตัวจริงของเรา** (`parse()` จาก `src/engine`) กับข้อความใน editor แล้วแปลง `line/col` → offset ในเอกสาร
  - ตรงนี้คือที่ "นับคอลัมน์เป็น UTF-16" จาก M1 ได้ใช้จริง — CodeMirror นับ offset เป็น UTF-16 เหมือนกัน เส้นหยักแดงจึงตรงตำแหน่งเสมอ
  - Linter parse ข้อความใน editor เอง (ไม่ได้รับ errors เป็น prop) เพื่อให้ error ตรงกับสิ่งที่อยู่บนจอเสมอ
- Editor ถูกสร้าง **ครั้งเดียว** ใน `useEffect` แล้วอ่าน props ล่าสุดผ่าน `ref` — ถ้าสร้างใหม่ทุก render จะเสีย cursor/undo history

## 5. หน้าเว็บสองภาษา แบบไม่มี server function

- `app/[lang]/layout.tsx` เป็น **root layout** + `generateStaticParams` คืน `th`, `en` → build ออกมาเป็นไฟล์ static
- Next 16: `params` เป็น **Promise** (`await params`) และมี type `LayoutProps<"/[lang]">` / `PageProps<…>` ให้ใช้ทั่วโปรเจกต์
- `/` → `/th` หรือ `/en`: ใช้ `redirects()` ใน `next.config.ts` ที่เช็ก cookie `lang` (ปุ่มสลับภาษาเป็นคน set) แทน `proxy` (ชื่อใหม่ของ middleware ใน Next 16) เพราะ proxy = รัน function ทุก request → ขัดกับเป้า 0 บาท
- Dictionary ภาษาไทยมี type เป็น `Dictionary = typeof en` — ลืมแปล key ไหน TypeScript ฟ้องทันที

## 6. ธีม และ "ห้ามกะพริบ"

ธีมที่ผู้ใช้เลือกอยู่ใน localStorage ซึ่ง server อ่านไม่ได้ ถ้าตั้งธีมใน React (`useEffect`) จะเห็นจอสว่างแวบหนึ่งก่อนเปลี่ยนเป็นมืด (flash) วิธีแก้ตามคู่มือ Next 16: **inline script ใน `<head>`** ที่รันก่อนเบราว์เซอร์วาดจอ ตั้ง `data-theme` บน `<html>` แล้ว CSS variables ทั้งหมดเปลี่ยนตาม

ปุ่มสลับธีม render **ไอคอนทั้งสองอัน** แล้วให้ CSS ซ่อนอันที่ไม่ใช้ — markup จาก server กับ client จึงเหมือนกันเสมอ ไม่เกิด hydration mismatch

Playground ใช้หลักเดียวกันกับ localStorage: render ว่างก่อน (ทั้งบน server และ client รอบแรก) แล้วค่อย render ตัวจริงหลัง mount ด้วย `useSyncExternalStore(…, () => true, () => false)` — ค่าเป็น `false` ตอน server/hydrate และ `true` หลังจากนั้น

## 7. บั๊กที่เจอตอนตรวจด้วย screenshot

ผมเขียน script Playwright เปิดเว็บจริง คลิกทุกปุ่ม แล้วถ่ายภาพมาดู เจอ 4 อย่างที่ unit test จับไม่ได้:

1. **กด "ทีละขั้น" ครั้งที่สองแล้วหน้าพัง** (`destroy is not a function`)
   ```ts
   useEffect(() => end.current?.scrollIntoView(...), [k]);   // ❌
   ```
   Arrow function ไม่มีปีกกา = **คืนค่า** ของ `scrollIntoView` และ React ถือว่าค่าที่ effect คืนคือ cleanup function เดิมทีมันคืน `undefined` เลยไม่มีปัญหา แต่เบราว์เซอร์รุ่นใหม่เปลี่ยนให้ scroll method คืน **Promise** → React พยายามเรียก Promise เป็นฟังก์ชันตอน cleanup → พัง แก้โดยใส่ `{ }` ให้ effect ไม่คืนค่าอะไร — บทเรียน: **effect ควรคืนค่าก็ต่อเมื่อตั้งใจคืน cleanup เท่านั้น**
2. **ปุ่ม "รันจนจบ" มองไม่เห็นตัวหนังสือ** — element มีทั้ง `bg-panel` และ `bg-accent` ใน Tailwind ตัวที่ชนะคือตัวที่อยู่**หลังใน CSS ที่ generate ออกมา** ไม่ใช่ตัวที่เขียนหลังใน `className` แก้โดยแยก class ของปุ่มหลักออกมาต่างหาก ไม่ "override" ทับ
3. **ภาษาไทยในฟอนต์ mono ดูห่าง ๆ** — ฟอนต์ mono ไม่มีอักษรไทย เบราว์เซอร์ใช้ฟอนต์สำรองที่ความกว้างคงที่ แก้โดยใช้ `font-mono` เฉพาะชื่อ atom/กฎ
4. **ต้นไม้ Mini-MYCIN เล็กเกินไป** — ต้นไม้กว้างกว่าพื้นที่ แก้โดยลดขนาด node และเพิ่มพื้นที่ให้ส่วนต้นไม้

## 8. คำถามทดสอบตัวเอง

1. ทำไมปุ่ม "ย้อน" ของเราไม่ต้องมีโค้ด undo เลย? ถ้า engine เป็นแบบ "เดินทีละขั้นและเก็บ state ไว้ข้างใน" จะต้องทำอะไรเพิ่ม?
2. `howForward` รับพารามิเตอร์ `before` ไปทำไม? ถ้าไม่มี จะเกิดอะไรขึ้นตอนผู้ใช้กด HOW ที่ขั้นที่ 2 จาก 5?
3. ทำไมเราเลือก `redirects()` ใน `next.config.ts` แทน `proxy` ทั้งที่ proxy อ่าน `Accept-Language` ได้และฉลาดกว่า?
4. ถ้าเราตั้งธีมด้วย `useEffect` แทน inline script ผู้ใช้ที่เลือกธีมมืดไว้จะเห็นอะไรตอนโหลดหน้า? และทำไม inline script ถึงแก้ได้?
5. Layout ของต้นไม้รับประกันได้อย่างไรว่า subtree สองอันจะไม่ทับกัน?
