# 04 — บทเรียน, Quiz และ Widget (M4)

M4 เพิ่มบทเรียน 6 บท × 2 ภาษา, quiz 2 แบบ, widget 3 ตัว และการเก็บความคืบหน้า เหตุผลหลักอยู่ใน [ADR 0007](../adr/0007-lessons-as-mdx-with-registry.md)

```
src/
├── content/lessons/{th,en}/<slug>.mdx   เนื้อหา (MDX = Markdown + JSX)
├── lessons/
│   ├── registry.ts      รายชื่อบท, ชื่อสองภาษา, id ของ quiz ทุกข้อ
│   ├── progress.ts      quiz ที่ตอบถูก (localStorage + useSyncExternalStore)
│   ├── fuzzy.ts         Mamdani inference (ไม่มี React — มี test)
│   └── knowledge-net.ts ลำดับชั้น isA + inheritance (ไม่มี React — มี test)
├── components/lessons/  Quiz, PredictNextRule, FuzzyWidget, SemanticNet/Frames, LessonNav
├── mdx-components.tsx   style ของ markdown + component ที่ MDX ใช้ได้
└── app/[lang]/lessons/  หน้ารายการบท และหน้าบทเรียน /[lang]/lessons/[slug]
```

---

## 1. MDX ทำงานอย่างไร

MDX = Markdown ที่ใส่ JSX ได้ ตอน build `@next/mdx` แปลงไฟล์ `.mdx` เป็น **React component** หนึ่งตัว — หัวข้อ `##` กลายเป็น `<h2>` และ `<Quiz … />` กลายเป็น component จริง

หน้าบทเรียน import ไฟล์ตามภาษาและ slug:

```ts
const { default: Content } = await import(`@/content/lessons/${lang}/${slug}.mdx`);
```

bundler เห็น template นี้แล้ว **รวมทุกไฟล์ที่ตรง pattern ไว้ตอน build** ไม่ได้โหลดจาก disk ตอนรัน — ทุกหน้าบทเรียนจึงยังเป็น static

`mdx-components.tsx` (ไฟล์บังคับของ Next) ทำสองอย่าง: กำหนด style ให้ element ของ markdown (h2, table, code, …) และลงทะเบียน component ที่ MDX เรียกได้โดยไม่ต้อง import

### ปัญหา: MDX component ไม่รู้ภาษาของหน้า

`<Quiz>` ต้องแสดงปุ่ม "ตรวจคำตอบ" หรือ "Check answer" แต่ MDX ส่งให้มันแค่ props ที่เขียนในไฟล์ แก้ด้วย **React context**: หน้าบทเรียนห่อเนื้อหาด้วย `<LessonProvider lang dict>` แล้ว component ใดก็ได้ข้างในเรียก `useLesson()` เพื่ออ่านภาษาและข้อความ ผู้เขียนเนื้อหาไม่ต้องส่ง `lang` เองเลย

## 2. Test ที่กันสองภาษาไม่ให้เพี้ยน

`registry.ts` เก็บ id ของ quiz ทุกข้อในแต่ละบท test (`lessons.test.ts`) อ่านไฟล์ MDX ทั้ง 12 ไฟล์ด้วย regex แล้วเช็กว่า id ตรงกับ registry **ครบและเรียงเหมือนกัน** ทั้งไทยและอังกฤษ

ผลที่ได้:
- ลืมแปล quiz ข้อหนึ่ง → test พัง
- ตัวเลข "x / y quiz" ในหน้ารายการบทถูกต้องเสมอ เพราะ y มาจาก registry ที่ test ยืนยันแล้ว
- ระหว่างเขียน test นี้จับได้ว่าผมเรียงลำดับ quiz บทที่ 3 ใน registry ผิด

## 3. Quiz "ทายกฎถัดไป" — ใช้ engine จริงเฉลย

```mdx
<PredictNextRule id="l4-p1" strategy="specificity" source={`fact bird ...`} />
```

ผู้เขียนให้แค่ **กฎ + กลยุทธ์ + รอบที่จะถาม** ที่เหลือ component ทำเอง:

1. `parse` + `forwardChain` ด้วยกลยุทธ์ที่กำหนด
2. แสดง working memory ณ ก่อนรอบนั้น (`memoryAt` ตัวเดียวกับ Playground)
3. ตัวเลือก = conflict set **เรียงตามบรรทัด** (ถ้าเรียงตามกลยุทธ์ ลำดับจะเฉลยคำตอบเอง)
4. คำตอบ = `steps[cycle-1].fired` และคำอธิบาย = ลำดับเต็มตามกลยุทธ์

เพราะคำตอบมาจาก engine ตัวเดียวกับ Playground **คำถามกับ Playground จึงไม่มีทางขัดกัน** — ถ้าผู้เขียนเขียนกฎผิด component จะ throw error ระหว่างทดสอบแทนที่จะแสดงเฉลยผิด

## 4. Fuzzy widget — Mamdani ทีละขั้น (`fuzzy.ts`)

**Membership function** แบบสี่เหลี่ยมคางหมู (a, b, c, d): ขึ้นจาก a ถึง b, คงที่ 1 ถึง c, ลงถึง d

**ตัวอย่างที่ 37.4 °C:**

1. **Fuzzify:** "ปกติ" (35, 35, 36.8, 37.6) → (37.6 − 37.4)/(37.6 − 36.8) = **0.25**, "มีไข้" (37.2, 38, 38.4, 39.2) → (37.4 − 37.2)/(38 − 37.2) = **0.25**, "ไข้สูง" = 0
2. **Rule evaluation:** ปกติ→เสี่ยงต่ำ fire 0.25, มีไข้→เสี่ยงกลาง fire 0.25
3. **Aggregation:** ตัดเซต "ต่ำ" และ "กลาง" ที่ความสูง 0.25 แล้วเอา max ของทั้งสองรูป
4. **Defuzzify (centroid):** หาจุดศูนย์ถ่วงของพื้นที่ = ∫ y·μ(y) dy / ∫ μ(y) dy เราประมาณ integral ด้วย **midpoint rule** แบ่ง 400 ช่อง (ไม่ต้องหาสูตรปิดของรูปทรงที่ถูกตัด)

Test ที่ล็อกความถูกต้อง: ที่ 38.2 °C มีแค่กฎ "มีไข้" fire และเซต "กลาง" สมมาตรรอบ 50 → centroid ต้องได้ **50** พอดี

สีของเส้นกราฟมาจาก palette ที่ผ่าน validator (CVD-safe ทั้งธีมสว่างและมืด) และทุกเส้นมี **ป้ายชื่อกำกับ** พร้อมตารางตัวเลข เพราะสีเขียวน้ำทะเลบนพื้นขาว contrast ต่ำกว่า 3:1 — ผู้ใช้จึงไม่ต้องแยกเส้นด้วยสีอย่างเดียว

## 5. Semantic net และ Frames — ข้อมูลชุดเดียว สองมุมมอง (`knowledge-net.ts`)

ข้อมูลคือลำดับชั้นนกขมิ้นของ Collins & Quillian (1969): แต่ละ concept เก็บเฉพาะ property **ของตัวเอง** ที่เหลือได้จากการสืบทอดตาม `isA`

- **`lookup(concept, property)`** — เดินขึ้นตาม isA หยุดที่ concept **แรก** ที่มี property นั้น → ค่าที่ใกล้กว่าชนะเสมอ (นี่คือกลไก override: ostrich `can_fly = no` บังค่า `yes` ของ bird) และคืนจำนวน hop ที่ใช้ ซึ่งตรงกับผลการทดลองเรื่องเวลาตอบของ Collins & Quillian
- **`slots(frame)`** — เดินขึ้นทั้งสาย เก็บ slot แรกที่เจอของแต่ละชื่อ และบันทึกว่ามันไป **บัง** ค่าของ frame ไหน

สองฟังก์ชันนี้คือ inheritance แบบเดียวกัน มองจากสองด้าน — ตรงกับเนื้อหาบทที่ 2 ที่ว่า semantic network กับ frames ต่างกันที่มุมมอง ไม่ใช่กลไก

## 6. ความคืบหน้า (`progress.ts`)

- เก็บ id ของ quiz ที่ตอบถูกเป็น array ใน localStorage
- อ่านด้วย `useSyncExternalStore` โดยให้ **snapshot เป็น string ดิบ** — React เปรียบเทียบ string ได้ถูกและเร็ว แล้วค่อย parse เป็น `Set` ใน `useMemo` (ถ้าคืน `Set` ใหม่ทุกครั้ง React จะคิดว่าค่าเปลี่ยนตลอด → render วนไม่จบ)
- event `storage` แจ้งเฉพาะ **แท็บอื่น** เราจึงยิง event ของเราเอง (`inferlab-progress`) ให้ sidebar ในแท็บเดียวกันอัปเดตทันทีที่ตอบถูก

## 7. บั๊กที่เจอตอนตรวจด้วยเบราว์เซอร์จริง

1. **ลิงก์ "ลองใน Playground" เปิดตัวอย่างผิด** — `load()` อ่าน `window.location.search` แต่ตอนเปลี่ยนหน้าด้วย `<Link>` ของ Next ตัว URL ในเบราว์เซอร์ถูกอัปเดต **หลัง** render จึงอ่านได้ URL เก่า แก้โดยใช้ `useSearchParams()` (ได้ค่าใหม่ตั้งแต่ตอน render) ห่อด้วย `<Suspense>` ตามคู่มือ และตั้ง `key` ตาม example ที่ขอ เพราะ Cache Components **เก็บหน้าเดิมไว้ไม่ unmount** — ถ้าไม่มี key ค่า state เก่าจะค้าง ทดสอบทั้งกรณีเปิดตรงและกรณีไปกลับระหว่างหน้า
2. **Server เก่าค้างจาก M3 แย่ง port** — `npx next start` สร้าง process ลูก การหยุด `npx` ไม่ได้หยุดลูก ทำให้ test รอบแรกคุยกับ build เก่า (ทุกหน้าบทเรียนได้ 404) บทเรียน: เมื่อผลแปลก ให้เช็กก่อนว่ากำลังทดสอบ *ของที่คิดว่ากำลังทดสอบ* อยู่จริงหรือเปล่า
3. **ภาษาไทยในฟอนต์ mono อีกสองจุด** (ผลลัพธ์ semantic net และกล่องโค้ดของ Bayes) — ปัญหาเดียวกับ M3 ที่ผมทำซ้ำ

## 8. คำถามทดสอบตัวเอง

1. ทำไม `<PredictNextRule>` เรียงตัวเลือกตามบรรทัด ไม่ใช่ตามลำดับที่กลยุทธ์จัด?
2. คำนวณด้วยมือ: ที่ 38.9 °C เซต "มีไข้" และ "ไข้สูง" มี membership เท่าไหร่? (เซต: มีไข้ = 37.2, 38, 38.4, 39.2 และไข้สูง = 38.8, 39.6, 42, 42)
3. ถ้า `useProgress` คืน `new Set(JSON.parse(raw))` จาก `getSnapshot` โดยตรง จะเกิดอะไรขึ้น?
4. test ความเท่ากันของ quiz ระหว่างสองภาษาจับปัญหาอะไรได้ และ **จับอะไรไม่ได้**?
5. ถ้าเพิ่ม `penguin isA bird` ที่มี `can_fly: no` แล้วถาม `lookup("penguin", "has_skin")` จะผ่าน concept ไหนบ้าง และได้กี่ hop?
