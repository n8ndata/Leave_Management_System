# 🚀 Deploy Note — PWA ระดับ 2 ระบบขอลาพนักงาน

> **สรุปสถานะ:** ไฟล์ PWA ทั้งชุดเสร็จแล้ว พร้อมใช้งาน
> **ไม่มีการแก้ไขไฟล์ต้นฉบับเดิมของระบบ** (`index.html`, `js/app.js`, `css/styles.css` ไม่ถูกแตะแม้แต่บรรทัดเดียว)
> คุณควบคุมจังหวะนำไปใช้เองได้ 100% ตามขั้นตอน ก + ข ด้านล่าง

---

## 1. ไฟล์ที่เพิ่มเข้ามาใหม่ (ไฟล์ลอยทั้งหมด — ไม่แตะไฟล์เดิม)

| ไฟล์ | หน้าที่ |
|---|---|
| `manifest.webmanifest` | การ์ด "ตัวตนของแอป" — ชื่อ / สีธีม / ไอคอน / โหมด standalone |
| `sw.js` | Service Worker — แคช app shell + CDN, navigation network-first, static stale-while-revalidate |
| `icons/icon-192.png` | ไอคอนแอป 192×192 (มุมโค้ง) |
| `icons/icon-512.png` | ไอคอนแอป 512×512 (มุมโค้ง) |
| `icons/icon-maskable-512.png` | ไอคอนพื้นเต็ม — Android จะ crop ไม่ให้รูปหลุดขอบ |
| `icons/icon-180.png` | apple-touch-icon สำหรับ iPhone |
| `icons/make-icons.ps1` | สคริปต์สร้างไอคอน (ไว้ถ้าต้องการเปลี่ยนโลโก้ภายหลัง) |

---

## 2. ขั้นตอน "ก" — แทรกบล็อกเดียวลงใน `index.html` (แก้ไฟล์นี้ครั้งเดียว)

บราวเซอร์ไม่รู้จัก PWA จนกว่าจะประกาศใน `<head>` — ขั้นนี้จึงต้องแตะ `index.html` ครั้งเดียว

**วิธี:**
1. เปิดไฟล์ `index.html`
2. ค้นหาบรรทัดนี้ (ประมาณบรรทัดที่ 5)
   ```html
   <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
   ```
3. แปะบล็อกด้านล่างนี้ **ต่อจากบรรทัดนั้นทันที**

```html
<!-- ========== PWA: ROUTER leave system ========== -->
<link rel="manifest" href="manifest.webmanifest">
<meta name="theme-color" content="#082f49">
<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/icon-180.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="ROUTER ลา">
<script>
try{
  if('serviceWorker' in navigator && (location.protocol==='https:'||location.hostname==='localhost')){
    var pwa_sw_path = location.pathname.replace(/index\.html$/,'') || '/';
    navigator.serviceWorker.register(pwa_sw_path + 'sw.js').catch(function(e){console.warn('[PWA] register failed',e);});
  }
}catch(e){console.warn('[PWA] skip',e);}
</script>
<!-- ========== /PWA ========== -->
```

**หมายเหตุทางเทคนิค:** `index.html` ประกาศ `<base href="...">` ชี้ตรงไปที่ GitHub Pages แล้ว — ผมจึงใช้ `location.pathname` ในการ register service worker เพื่อไม่ให้เปิด phase cross-origin ตอนทดสอบเครื่องเอง

---

## 3. ขั้นตอน "ข" — นำขึ้นระบบจริง (GitHub Pages)

1. นำไฟล์เหล่านี้ไปวางใน repo `n8ndata/router-leave-system` ให้พาธ "แผนเดียวกับ index.html"
   - `sw.js`, `manifest.webmanifest`, โฟลเดอร์ `icons/*`
   - และ `index.html` ที่แปะบล็อกของขั้นตอน "ก" แล้ว
2. `commit` + `push` (แนะนำสำรอง `index.html` 1 ชุดก่อนแก้)
3. รอ GitHub Pages สร้างเว็บใหม่ 1–3 นาที
4. ใช้มือถือเปิด https://n8ndata.github.io/router-leave-system/ **ตามลำดับ: เปิดครั้งแรกเพื่อ cache** แล้วปุ่มติดตั้งจะพร้อมใช้
5. **Android (Chrome):** เมนู ⋮ → "ติดตั้งแอป" / **iPhone (Safari):** Share → "เพิ่มลงหน้าจอหลัก"

---

## 4. ผลลัพธ์ที่ได้ (ระดับ 2)

| สถานการณ์ | ผล |
|---|---|
| เน็ตหลุด + เปิดแอป | เปิดได้ — เห็นหน้า UI จาก cache ที่เก็บไว้ |
| ข้อมูล (Firebase) ตอน offline | ยังไม่โหลดใหม่ได้ — ต้องรอบ next ระดับ 3 |
| ติดตั้ง icon ลงหน้าจอหลัก | ได้ — icon, theme ตามระบบ |
| Login offline | ยังไม่ได้ (ต้องแก้ `js/app.js` + `index.html` เชื่อมต่อขั้นถัดไป) |
| ยื่นใบลา offline | ไม่ได้ — Firebase ต้อง online |

---

## 5. กฎสำคัญ — ทุกครั้งที่ push ต้อง "bump version cache"

แก้ไฟล์ `index.html` / `js/app.js` / `css/styles.css` เมื่อไร เปิด `sw.js` แล้วเพิ่มเลขบรรทัดนี้ตาม

```js
const CACHE_NAME = 'router-leave-pwa-v1';  // ← ต่อ push: v2, v3, ...
```

ไม่เช่นนั้น เครื่องพนักงานที่แคชไว้จะยังโหลดโค้ดเวอร์ชันเก่า

---

## 6. Checklist ทดสอบ

- [ ] **Android (Chrome)** เข้าเว็บ → เมนู ⋮ → "ติดตั้งแอป" → ได้ icon แอป
- [ ] **iPhone (Safari)** → Share → "เพิ่มลงหน้าจอหลัก" → เปิดแบบ splash color theme
- [ ] เปิดแอปที่ติดตั้ง → **ปิด Wi-Fi/มือถือ** → เปิดแอปซ้ำ → UI ยังโชว์
- [ ] DevTools → Application → Service Workers → "ACTIVATED"
- [ ] Console ไม่มี `[PWA]` error ในการเชื่อมต่อเข้าเว็บครั้งแรก

---

## 7. ถ้ามีปัญหาทั่วๆ ไป — เหตุผลยอดฮิต

- **ปุ่ม "ติดตั้งแอป" ไม่ขึ้น** — มักเกิดจากเปิดหน้าเว็บครั้งเดียวแล้วยังไม่ได้รีเฟรชซ้ำ (service worker ต้องโหลดเสร็จก่อน 1 ครั้ง) หรือ Chrome ตรวจพบว่าไอคอน 192/512 ยังไม่ถึงปลายทาง (ต้อง push `icons/*` ไปด้วย)
- **`[PWA] register failed` ใน console** — ตรวจว่า `sw.js` ถูก push ไปอยู่ "ระดับเดียวกับ `index.html`" (โฟลเดอร์เดียวกัน) และชื่อไฟล์ไม่มีช่องว่างหรือสะกดคลาด
- **icon ไม่โชว์บน iOS** — ตรวจว่า `<link rel="apple-touch-icon" href="icons/icon-180.png">` อยู่ในช่วง `<head>...</head>` และไฟล์ `icons/icon-180.png` ถูก push ไปแล้ว

ทำถึงขั้นไหนติด บอกได้เสมอครับ — ผมเต็มใจช่วยตรวจและแก้แบบทีละข้อ จนกว่าจะทำงานได้จริงบนมือถือ
