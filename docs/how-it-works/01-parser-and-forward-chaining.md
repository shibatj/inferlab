# 01 — Parser และ Forward Chaining (M1)

เอกสารนี้อธิบายโค้ดใน `src/engine/` ตั้งแต่หลักการพื้นฐาน อ่านจบแล้วควรตอบได้ว่า "ข้อความที่ผู้เรียนพิมพ์ กลายเป็นข้อสรุปได้อย่างไร" ทุกขั้นตอน

```
source text ──tokenize()──▶ tokens ──parse()──▶ KnowledgeBase ──forwardChain()──▶ steps + facts
             lexer.ts                parser.ts                  forward.ts
```

---

## 1. ภาษากฎ (DSL)

```
# คอมเมนต์เริ่มด้วย #
fact has_hair
rule Z1: IF has_hair THEN mammal
rule Z5: IF mammal AND eats_meat THEN carnivore
```

ไวยากรณ์ทั้งหมด (หนึ่ง statement ต่อหนึ่งบรรทัด):

```
program   := line*
line      := statement? NEWLINE
statement := "fact" IDENT
           | "rule" IDENT ":" "IF" IDENT ("AND" IDENT)* "THEN" IDENT
```

การตัดสินใจที่ควรรู้ (เหตุผลอยู่ใน `docs/adr/`):

- **Propositional** — สัญลักษณ์แต่ละตัว (`has_hair`) เป็นแค่ "จริง" หรือ "ยังไม่รู้" ไม่มีตัวแปร ไม่มีค่าตัวเลข
- **AND อย่างเดียว ไม่มี OR / NOT** — ถ้าต้องการ OR ให้เขียนหลายกฎที่สรุปเรื่องเดียวกัน (เช่น Z1 กับ Z2 ใน test สรุป `mammal` ทั้งคู่)
- **Keyword ไม่สนตัวพิมพ์** (`IF` = `if`) แต่ **ชื่อสนตัวพิมพ์** (`A` ≠ `a`) เหมือนภาษาโปรแกรมส่วนใหญ่
- **ชื่อเป็นภาษาไทยได้** — `fact มีขน` ใช้ได้

## 2. Lexer (`lexer.ts`) — ตัดข้อความเป็น token

Lexer เดินทีละตัวอักษร แล้วจัดกลุ่มเป็น token 5 ชนิด: `keyword`, `ident`, `colon`, `newline`, `eof`

จุดที่ไม่ชัดเจนตอนอ่านโค้ดครั้งแรก:

1. **ทำไมต้องมี `\p{M}` ใน regex ของชื่อ?** สระและวรรณยุกต์ไทยหลายตัว (ิ ี ั ่ ้) ใน Unicode เป็น *combining mark* (หมวด M) ไม่ใช่ *letter* (หมวด L) ถ้าใช้แค่ `\p{L}` คำว่า `มีขน` จะถูกตัดขาดตรง `ี`
2. **ทำไมนับคอลัมน์เป็นหน่วย UTF-16?** ใน M3 เราจะเอาตำแหน่ง error ไปวาดเส้นหยักแดงใน CodeMirror ซึ่งนับตำแหน่งเป็น UTF-16 code unit (เหมือน `string.length` ของ JavaScript) อีโมจิ 1 ตัวกิน 2 หน่วย ถ้านับไม่ตรงกัน เส้นแดงจะเลื่อน — มี test ชื่อ `measures columns in UTF-16 code units` ล็อกพฤติกรรมนี้ไว้
3. **เจอตัวอักษรแปลก ๆ แล้วทำไมไม่หยุด?** Lexer บันทึก `UNEXPECTED_CHAR` แล้วข้ามไป เพื่อให้ยังรายงาน error บรรทัดอื่น ๆ ได้ต่อ

## 3. Parser (`parser.ts`) — recursive descent

Parser เป็นแบบ **recursive descent**: หนึ่งฟังก์ชันต่อหนึ่งกฎไวยากรณ์ (`parseStatement`, `parseRule`) อ่าน token ไปทางซ้ายไปขวา ดู token ถัดไปทีละตัว (lookahead = 1) — ไวยากรณ์นี้ง่ายพอที่ token แรกของบรรทัด (`fact` หรือ `rule`) บอกได้เลยว่าต้องเรียกฟังก์ชันไหน

### Error recovery แบบ panic mode

ผู้เรียนพิมพ์ผิดบ่อย ถ้า parser หยุดที่ error แรก เขาจะต้องแก้ทีละจุดซึ่งน่ารำคาญ เราจึงใช้ **panic-mode recovery**:

1. เจอ error → `throw LineError`
2. ลูปหลัก `catch` ไว้ บันทึก error แล้ว **ข้าม token ที่เหลือจนสุดบรรทัด**
3. เริ่ม parse บรรทัดถัดไปตามปกติ

ได้ผลว่า **หนึ่งบรรทัดผิด = หนึ่ง error** และบรรทัดที่ถูกยังถูกอ่านเข้า KB ได้ ภาษาที่ "หนึ่ง statement ต่อบรรทัด" ทำให้ newline เป็น *synchronization point* ที่ดีมาก

### บั๊กที่ test จับได้ระหว่างพัฒนา

เดิม `next()` เขียนเป็น `tokens[pos++]` ถ้า error เกิดตรงท้ายไฟล์ (เช่น `rule R: IF a THEN` ขาดข้อสรุป) parser จะกิน token `eof` แล้ว `pos` เลยขอบ array → `peek()` คืน `undefined` → crash แก้โดยให้ `next()` **ไม่เลื่อนผ่าน EOF** — EOF เป็น token "เฝ้าประตู" ที่อ่านซ้ำได้ไม่จำกัด

### Error code กับข้อความ

ทุก error มี `code` คงที่ (เช่น `EXPECTED_COLON`) และ `message` ภาษาอังกฤษ ตอนทำ UI สองภาษา เราแปลจาก `code` ไม่ต้องไป parse ข้อความ

| Code | เกิดเมื่อ | ตัวอย่าง |
|---|---|---|
| `UNEXPECTED_CHAR` | ตัวอักษรที่ภาษาไม่รู้จัก (lexer) | `fact a-b` |
| `EXPECTED_STATEMENT` | บรรทัดไม่ได้ขึ้นต้นด้วย `fact` หรือ `rule` | `a` |
| `EXPECTED_IDENT` | ต้องการชื่อ แต่เจออย่างอื่น (รวมถึง keyword หรือสุดบรรทัด/ไฟล์) | `rule R: IF a THEN` |
| `EXPECTED_COLON` | ไม่มี `:` หลังชื่อกฎ | `rule R IF a THEN b` |
| `EXPECTED_IF` | ไม่มี `IF` หลัง `:` | `rule R: a THEN b` |
| `EXPECTED_AND_OR_THEN` | หลัง premise ไม่ใช่ `AND` หรือ `THEN` | `rule R: IF a b` |
| `EXPECTED_END_OF_LINE` | มี token เกินมาหลัง statement จบ | `fact a b` |
| `DUPLICATE_RULE` | ชื่อกฎซ้ำ (ตรวจหลัง parse ครบทั้งไฟล์) | `rule R: …` สองครั้ง |

## 4. Forward chaining (`forward.ts`)

Forward chaining คือการ **เริ่มจากข้อเท็จจริง แล้วไล่สรุปไปข้างหน้า** จนสรุปอะไรเพิ่มไม่ได้อีก (quiescence) Engine ทำงานเป็นรอบ เรียกว่า **recognise–act cycle**:

```
loop:
  1. MATCH    หากฎที่ premise ทุกตัวอยู่ใน working memory และยังไม่เคย fire → conflict set
  2. ถ้า conflict set ว่าง → หยุด
  3. SELECT   เลือกหนึ่งกฎจาก conflict set (M1: เอากฎที่อยู่บนสุดในไฟล์ = "rule order")
  4. ACT      fire กฎนั้น: ใส่ข้อสรุปลง working memory
```

### Trace จริงจาก test `zoo knowledge base`

Facts เริ่มต้น: `has_hair, eats_meat, tawny_color, dark_spots, black_stripes`

| Cycle | Conflict set | Fire | เพิ่ม fact |
|---|---|---|---|
| 1 | Z1 | Z1 | `mammal` |
| 2 | Z5 | Z5 | `carnivore` |
| 3 | Z9, Z10 | Z9 (อยู่บนกว่า) | `cheetah` |
| 4 | Z10 | Z10 | `tiger` |
| 5 | (ว่าง) | — หยุด — | |

สังเกต cycle 3: ทั้ง Z9 และ Z10 match พร้อมกัน — นี่คือ **conflict** และ "rule order" เลือก Z9 ส่วน Z2 (`gives_milk`) และ Z3 (`has_feathers`) ไม่เคยเข้า conflict set เพราะ premise ไม่เป็นจริง

> ผลที่ได้ทั้ง cheetah และ tiger เพราะเราใส่ facts ขัดกันเอง (ทั้งจุดและลาย) — ระบบ propositional ไม่รู้ว่าสองข้อสรุปนี้ขัดกัน เป็นตัวอย่างที่ดีของข้อจำกัดที่จะเอาไปสอนในบทเรียน

### Refraction และการรับประกันว่าจะหยุด

**Refraction** = กฎหนึ่งจะไม่ fire ซ้ำกับข้อมูลชุดเดิม ใน OPS5/CLIPS นิยามเป็น "ต่อ instantiation" (กฎ + ชุด fact ที่ match) แต่ในระบบเรา:

- ระบบเป็น propositional → กฎแต่ละกฎมี instantiation ได้ **แค่แบบเดียว**
- Fact ไม่เคยถูกลบ (monotonic) → instantiation นั้นไม่มีวันเปลี่ยน

ดังนั้น "ไม่ fire ซ้ำต่อ instantiation" = **"แต่ละกฎ fire ได้ครั้งเดียว"** ซึ่งโค้ดทำด้วย `Set` ชื่อ `fired`

ผลพลอยได้: ทุก cycle fire กฎที่ไม่ซ้ำกัน → **จำนวน cycle ≤ จำนวนกฎ** engine จึง *หยุดแน่นอน* แม้จะมีกฎวน (`a → b`, `b → a`) — มี test `terminates on circular rules` พิสูจน์ไว้ ไม่ต้องมีตัวนับ "max iterations" กันลูปไม่รู้จบ

### กฎที่ข้อสรุปรู้อยู่แล้ว

ถ้ากฎ match แต่ข้อสรุปอยู่ใน working memory แล้ว กฎยัง **fire** (ถูกนับเป็นหนึ่ง cycle) แต่ `added` เป็น `null` แบบนี้ step log จะแสดงให้ผู้เรียนเห็นว่ากฎนั้นทำงานแต่ไม่ได้ข้อมูลใหม่ ตรงกับพฤติกรรมของ production system ทั่วไป

### ความซับซ้อน

ทุก cycle ตรวจทุกกฎทุก premise: O(R × P) ต่อ cycle และมีไม่เกิน R cycle → **O(R² × P)** สำหรับ KB ขนาดสอน (หลักสิบกฎ) เร็วเกินพอ ระบบจริงขนาดใหญ่ใช้ **Rete algorithm** เพื่อไม่ต้อง match ใหม่ทั้งหมดทุกรอบ — เป็นหัวข้อดีสำหรับบทเรียน แต่ไม่จำเป็นต้องทำใน engine นี้

## 5. คำถามทดสอบตัวเอง

ลองตอบให้ได้ก่อนไป M2:

1. ถ้าสลับบรรทัด Z9 กับ Z10 ผล trace cycle 3 จะเปลี่ยนอย่างไร?
2. ทำไม parser ของเราใช้ lookahead แค่ 1 token ก็พอ?
3. ถ้าวันหนึ่งเราเพิ่ม `NOT` ข้อพิสูจน์ "engine หยุดแน่นอน" ข้างบนยังจริงไหม? ทำไม? (คำใบ้: monotonic)
4. `rule R: IF a THEN` ได้ error อะไร ที่คอลัมน์ไหน และทำไมความยาว underline เป็น 1?
