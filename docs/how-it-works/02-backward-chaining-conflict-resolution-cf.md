# 02 — Certainty Factors, Conflict Resolution และ Backward Chaining (M2)

ต่อจาก [01](01-parser-and-forward-chaining.md) M2 เพิ่มสามเรื่อง:

```
cf.ts         สูตร certainty factor ของ MYCIN
forward.ts    + CF  + conflict resolution 4 กลยุทธ์
backward.ts   backward chaining → AND/OR tree + event log
```

เหตุผลของการตัดสินใจอยู่ใน [ADR 0004](../adr/0004-certainty-factor-semantics.md) และ [ADR 0005](../adr/0005-exhaustive-backward-chaining.md)

---

## 1. ภาษากฎที่เพิ่มขึ้น

```
fact fever CF 0.8
rule R1: IF fever AND cough THEN flu CF 0.7 PRIORITY 5
```

- `CF n` ใส่ได้ทั้ง fact และ rule ค่าต้องอยู่ใน [-1, 1] ไม่ใส่ = 1
- `PRIORITY n` ใส่ได้เฉพาะ rule ต้องเป็นจำนวนเต็ม (ติดลบได้) ไม่ใส่ = 0 ต้องมาหลัง `CF` ถ้ามีทั้งคู่
- Lexer มี token ใหม่คือ `number` (`-?digits(.digits)?`) — `a-b` ยังเป็น error เหมือนเดิม เพราะ `-` ที่ไม่ได้ตามด้วยตัวเลขไม่ใช่ตัวเลข
- Error code ใหม่: `EXPECTED_NUMBER`, `CF_OUT_OF_RANGE`, `EXPECTED_INTEGER`
- `CF` และ `PRIORITY` กลายเป็น keyword → ใช้เป็นชื่อ fact ไม่ได้แล้ว (`fact cf` → `EXPECTED_IDENT`)

## 2. Certainty factors (`cf.ts`)

CF คือตัวเลข [-1, 1] บอกว่า "เชื่อแค่ไหน": 1 = จริงแน่นอน, -1 = เท็จแน่นอน, 0 = ไม่มีหลักฐาน **ไม่ใช่ความน่าจะเป็น** — CF ของ A กับ not-A ไม่จำเป็นต้องรวมกันได้ 1

สี่สูตรที่ใช้:

| เรื่อง | สูตร | เหตุผล |
|---|---|---|
| AND | `min(cf₁, cf₂, …)` | โซ่แข็งแรงเท่าห่วงที่อ่อนที่สุด |
| กฎ fire | `premiseCF × ruleCF` | กฎเองก็ไม่แน่นอน 100% |
| Threshold | premise "จริง" เมื่อ CF **> 0.2** | MYCIN ไม่ยอมใช้หลักฐานที่อ่อนมาก |
| รวมหลักฐาน | ดูด้านล่าง | หลายกฎสรุปเรื่องเดียวกัน |

**สูตรรวม (combine)** ของ MYCIN แยกเป็นสามกรณี:

```
a, b ≥ 0  :  a + b(1 − a)
a, b < 0  :  a + b(1 + a)
อื่น ๆ     :  (a + b) / (1 − min(|a|, |b|))
```

### ตัวอย่างคำนวณด้วยมือ

```
fact a CF 0.9
fact b CF 0.5
rule R1: IF a AND b THEN flu CF 0.8
rule R2: IF a THEN flu CF 0.5
```

1. R1: premise = min(0.9, 0.5) = **0.5** → ผ่าน threshold → contribution = 0.5 × 0.8 = **0.4**
2. R2: premise = 0.9 → contribution = 0.9 × 0.5 = **0.45**
3. รวม: 0.4 + 0.45 × (1 − 0.4) = 0.4 + 0.27 = **0.67**

สังเกตว่า combine ไม่สนลำดับ (0.45 + 0.4 × 0.55 = 0.67 เหมือนกัน) และ `combine(0, x) = x` — engine จึงเริ่มสะสมจาก 0 ได้เลยโดยไม่ต้องมีกรณีพิเศษ

### กรณีขอบ: 1 กับ −1

สูตรที่สามเมื่อ a = 1, b = −1 ได้ 0/0 — "แน่ใจว่าจริง" ชน "แน่ใจว่าเท็จ" เป็นความขัดแย้งที่ MYCIN ไม่ได้นิยาม เรากำหนดให้ได้ **0** (หักล้างกันหมด) และมี test ล็อกไว้

## 3. Forward chaining + CF

Loop เดิมจาก M1 เปลี่ยนสามจุด:

1. **Match** — premise ต้องมี CF > 0.2 ไม่ใช่แค่ "อยู่ใน memory"
2. **Act** — ถ้าข้อสรุปมีอยู่แล้ว ให้ **combine** CF เข้าไป (ไม่ใช่ข้าม)
3. **Step** — บันทึก `premiseCf`, `contribution`, `cfBefore`, `cfAfter`

### ข้อจำกัดที่ต้องเข้าใจ: CF ณ ตอน fire

Refraction ยังเป็น "กฎละครั้ง" เหมือน M1 ผลคือกฎใช้ CF ของ premise **ณ วินาทีที่ fire** ถ้าภายหลังมีกฎอื่นเพิ่ม CF ของ premise นั้น กฎที่ fire ไปแล้วจะไม่คำนวณใหม่ ตัวอย่างจาก test:

```
fact a
rule R2: IF a THEN b CF 0.5
rule R1: IF b THEN c
rule R3: IF a THEN b CF 0.5
```

| Cycle | Fire | ผล |
|---|---|---|
| 1 | R2 | b = 0.5 |
| 2 | R1 | c = 0.5 × 1 = **0.5** |
| 3 | R3 | b = 0.5 ⊕ 0.5 = **0.75** |

ถ้า "คิดให้ถูก" c ควรเป็น 0.75 แต่ได้ 0.5 เพราะ R1 fire ก่อน R3

**ทำไมไม่ให้ fire ซ้ำเมื่อ CF เปลี่ยน?** เพราะกฎวน `a → b`, `b → a` จะดัน CF กันขึ้นไปเรื่อย ๆ: 0.5 → 0.75 → 0.875 → … เข้าใกล้ 1 แต่ไม่มีวันถึง = **ไม่หยุด** เราเลือก "หยุดแน่นอน" แลกกับ "ผลขึ้นกับลำดับ" และเอาข้อจำกัดนี้ไปสอนเป็นบทเรียน (ADR 0004)

## 4. Conflict resolution (4 กลยุทธ์)

เมื่อ conflict set มีหลายกฎ engine **เรียงทั้ง set** ตามกลยุทธ์ แล้ว fire ตัวแรก (step เก็บลำดับทั้งหมดไว้ใน `conflictSet` ให้ UI แสดงว่าทำไมตัวนี้ชนะ) ทุกกลยุทธ์ **เสมอกันแล้วใช้ rule order** — ทำได้เพราะ `Array.prototype.toSorted` เป็น *stable sort* (ES2019 ขึ้นไปรับประกัน) ไม่ต้องเขียน tie-break เอง

| กลยุทธ์ | ชนะคือ | แนวคิด |
|---|---|---|
| `order` | อยู่บนสุดในไฟล์ | ง่ายสุด ผู้เขียนกฎควบคุมเอง |
| `specificity` | premise มากกว่า | กฎที่เจาะจงกว่าน่าจะถูกกว่า (กรณีพิเศษก่อนกรณีทั่วไป) |
| `priority` | `PRIORITY` สูงกว่า | ผู้เชี่ยวชาญกำหนดความสำคัญเอง (CLIPS เรียก *salience*) |
| `recency` | match fact ที่ใหม่กว่า | สนใจสิ่งที่เพิ่งเกิด — "focus of attention" |

### Recency แบบ OPS5 (LEX)

ทุก fact มี `time` = ลำดับที่เข้า working memory (1, 2, 3, …) ตอนเปรียบเทียบสองกฎ:

1. เอา `time` ของ premise แต่ละกฎ **เรียงจากใหม่ไปเก่า**
2. เทียบทีละตำแหน่งแบบ **lexicographic** (เหมือนเรียงคำในพจนานุกรม)
3. ถ้าเหมือนกันหมดจนรายการหนึ่งหมดก่อน กฎที่ premise **ยาวกว่า** ชนะ

```
fact a   # time 1
fact b   # time 2
fact c   # time 3
rule R1: IF a AND c THEN x    # [3, 1]
rule R2: IF b AND c THEN y    # [3, 2]  ← ชนะ: ตำแหน่งแรกเสมอ (3) ตำแหน่งสอง 2 > 1
```

> `time` ตั้งตอน fact **เข้ามาครั้งแรก** เท่านั้น การ combine CF ภายหลังไม่ทำให้ fact "ใหม่ขึ้น"

### ทำไมกลยุทธ์ถึงสำคัญ: ข้อสรุปเปลี่ยนได้

นี่คือคำตอบเต็มของคำถามข้อ 1 ในเอกสาร 01 — test `changes the conclusion when a strategy changes which rule fires first`:

```
fact tiger
fact cheetah
rule T: IF tiger THEN stripes
rule C: IF cheetah THEN spots
```

`order` fire T ก่อน แต่ `recency` fire C ก่อน (cheetah ใหม่กว่า) ใน KB นี้ทั้งคู่ fire ครบในที่สุด แต่ถ้าระบบ **หยุดเมื่อถึงเป้าหมาย** หรือ CF ขึ้นกับลำดับ (หัวข้อ 3) ผลลัพธ์สุดท้ายจะต่างกันจริง

## 5. Backward chaining (`backward.ts`)

Forward ถามว่า "จาก facts ที่มี สรุปอะไรได้บ้าง?" Backward ถามว่า "**เป้าหมายนี้จริงไหม?**" แล้วไล่ย้อนหา:

```
prove(goal):
  ถ้า goal อยู่บน stack อยู่แล้ว      → cycle (CF 0)
  ถ้า goal เคยคำนวณแล้ว              → cached (ใช้ผลเดิม)
  cf ← CF ของ fact (ถ้ามี) หรือ 0
  สำหรับทุกกฎที่สรุป goal:            ← OR node
      สำหรับแต่ละ premise:           ← AND node
          sub ← prove(premise)       ← เรียกซ้ำ
          ถ้า sub.cf ≤ 0.2 → กฎล้ม ข้าม premise ที่เหลือ
      ถ้ากฎผ่าน: cf ← combine(cf, premiseCF × ruleCF)
  status ← unknown | proven | failed
```

### AND/OR tree

ผลลัพธ์คือต้นไม้สองชั้นสลับกัน:

- **Goal node (OR)** — จริงได้ทางใดทางหนึ่ง: จาก fact *หรือ* จากกฎใดก็ได้
- **Rule node (AND)** — fire ได้ต่อเมื่อ premise *ทุกตัว* จริง

ตัวอย่าง car troubleshooting:

```
battery_dead?                      (goal, OR)  → proven, CF 0.9
└── B1                             (rule, AND) → fired, 1 × 0.9
    ├── lights_dim?    fact        → proven 1.0
    └── clicking_sound? fact       → proven 1.0
```

### Status ของ goal

| Status | ความหมาย |
|---|---|
| `proven` | CF > 0.2 |
| `failed` | มีของให้ประเมิน (fact หรือกฎ) แต่ CF ≤ 0.2 |
| `unknown` | ไม่มี fact และไม่มีกฎ → พิสูจน์ไม่ได้ (closed world, ADR 0003) |
| `cycle` | กำลังพิสูจน์ตัวเองอยู่ข้างบน → ตัดทิ้ง CF 0 |

### ต่างจาก Prolog ตรงไหน

Prolog หยุดที่กฎแรกที่สำเร็จ เราลอง **ทุกกฎ** (exhaustive) เพราะถ้าหยุดก่อน หลักฐานจากกฎที่เหลือจะหายไปและ CF ผิด ผลพลอยได้: ต้นไม้แสดงทุกทางเลือก ซึ่งเป็นสิ่งที่ AND/OR view ควรสอน ส่วน *ภายใน* กฎเรายัง short-circuit (premise แรกล้ม = หยุด) เพราะ AND ล้มแล้วผลไม่เปลี่ยน

### Memoisation และบั๊กที่ test จับได้

ถ้า atom เดียวกันโผล่หลายที่ในต้นไม้ (เช่น `c` เป็น premise ของทั้ง `a` และ `b`) เราคำนวณครั้งเดียวแล้วจำไว้ (`cache`) — ครั้งต่อไปเป็น `cached` node ไม่ต้องขยายซ้ำ

**แต่** ระหว่างพัฒนาผมเจอบั๊กจากการรีวิวโค้ดเอง แล้วเขียน test ให้มันพังก่อนแก้:

```
fact x
rule G:  IF a AND b THEN g
rule A1: IF x THEN a
rule A2: IF b THEN a
rule B:  IF a THEN b
```

1. prove(g) → prove(a) → ลอง A2 → prove(b) → ลอง B → prove(a): **a อยู่บน stack → cycle**
2. b จึงได้ `failed` และ **ถูก cache**
3. กลับมาที่ g → prove(b) (premise ที่สอง) → ได้ `failed` จาก cache → **g ล้ม**
4. แต่ความจริง a พิสูจน์ได้จาก x แล้ว → b ต้องจริง → g ต้องจริง!

ต้นเหตุ: ค่าของ b ถูกคำนวณ **ระหว่างที่ a ยังไม่เสร็จ** จึงเป็นค่าที่ไม่สมบูรณ์ แต่เรา cache มันเหมือนค่าสมบูรณ์

วิธีแก้: เมื่อเจอ cycle ย้อนไปหา atom ที่ตำแหน่ง k บน stack ให้ทำเครื่องหมาย **ทุก goal ที่อยู่เหนือ k ขึ้นไป** (ตรงกลางระหว่าง a กับจุดที่เจอ cycle) ว่า `partial` แล้ว **ไม่ cache** ค่าเหล่านั้น ส่วน a เองยัง cache ได้ เพราะสิ่งที่ a ขาดไปคือหลักฐานวนกลับมาหาตัวเอง ซึ่งเราตั้งใจทิ้งอยู่แล้ว

### Event log สำหรับ step-by-step

ทุก node ได้ `id` ตามลำดับที่ถูกเยี่ยม (DFS preorder) และ engine บันทึก `open` เมื่อเริ่มเยี่ยม `close` เมื่อได้ผล UI ใน M3 จะ replay log นี้: กด step หนึ่งครั้ง = หนึ่ง event → เห็นต้นไม้ค่อย ๆ งอกลงไปและค่าค่อย ๆ ไหลกลับขึ้นมา

### ทำไมรับประกันว่าจะหยุด

ทุกการเรียก `prove` ซ้อนลงไปเพิ่มความลึกของ stack หนึ่งชั้น และ atom ที่ซ้ำบน stack กลายเป็น cycle ทันที → ความลึก ≤ จำนวน atom ที่ต่างกัน → ต้นไม้จำกัด → หยุดแน่นอน (การไม่ cache ค่า partial อาจทำให้คำนวณซ้ำแบบ exponential ใน KB ที่มี cycle ซับซ้อนมาก ๆ แต่ KB ขนาดสอนไม่มีปัญหา — ADR 0005)

## 6. Forward vs Backward — สรุป

| | Forward | Backward |
|---|---|---|
| เริ่มจาก | facts | เป้าหมาย |
| คำถาม | "สรุปอะไรได้บ้าง?" | "เป้าหมายนี้จริงไหม?" |
| เหมาะกับ | การตรวจจับ/ตรวจสอบ (monitoring, configuration เช่น XCON) | การวินิจฉัย (diagnosis เช่น MYCIN) |
| ใช้ conflict resolution | ✅ (4 กลยุทธ์) | ❌ (ลองทุกกฎตาม rule order) |
| CF ขึ้นกับลำดับ | ได้ (หัวข้อ 3) | ไม่ (ใน KB ที่ไม่มี cycle) |
| ทำงานเกินจำเป็น | fire ทุกกฎที่ทำได้ แม้ไม่เกี่ยวกับคำถาม | สำรวจเฉพาะสิ่งที่เกี่ยวกับเป้าหมาย |

## 7. คำถามทดสอบตัวเอง

1. `fact a CF 0.9`, `fact b CF 0.3`, `rule R: IF a AND b THEN c CF 0.5` — c ได้ CF เท่าไหร่? ถ้าเปลี่ยน b เป็น `CF 0.2` ล่ะ?
2. ในตัวอย่างหัวข้อ 3 ถ้าเปลี่ยนเป็นกลยุทธ์ `specificity` c จะได้ CF เท่าไหร่? แล้วถ้าใช้ backward chaining ถามหา c ล่ะ?
3. ทำไม backward chaining ไม่ต้องใช้ conflict resolution ในการตัดสินผลลัพธ์ แต่ forward chaining ต้องใช้?
4. ในบั๊ก memoisation ข้างบน ทำไมเรา **ยัง cache ค่าของ a ได้** แม้ a จะเป็นต้นทางของ cycle?
5. `recency` เปรียบเทียบ R1 = `[5, 2]` กับ R2 = `[5, 2, 1]` — ใครชนะ? เพราะอะไร?
