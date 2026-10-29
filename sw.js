/* =====================================================================
   ROUTER ระบบขอลาพนักงาน — Service Worker (PWA)
   =====================================================================
   หน้าที่:
   1. แคช "App Shell" ตอนติดตั้ง (index.html + app.js + styles.css + ไฟล์จาก CDN)
      → เน็ตหลุด/ออฟไลน์ ยังเปิดแอปได้
   2. เปิดหน้า (navigation) → พยายามดึงของใหม่ก่อน ถ้าเน็ตชัด
      ถ้าเน็ตหลุด → ตอบด้วยแคช ล่าสุดทันที (ระดับ 2)
   3. ไฟล์ static/CDN → กลยุทธ์ stale-while-revalidate
      (ตอบจากแคชทันที แล้วดึงเวอร์ชันใหม่อัปเดตเบื้องหลังเงียบๆ)
   4. ไม่แตะ Firebase Realtime/WebSocket/REST หรือระบบ backup/notify — ปล่อยให้เน็ตจริงจัดการ

   ⚠️ กฎที่สำคัญมาก: ทุกครั้งที่แก้โค้ดแอปแล้ว push ขึ้น GitHub Pages
      → ต้องเพิ่มเลขเวอร์ชันใน CACHE_NAME ให้ถัดขึ้น 1 เสมอ (v1 → v2 → v3 …)
        ไม่งั้นเครื่องพนักงานที่เก็บ cache ไว้ จะยังเห็นของเก่า
   ===================================================================== */
const CACHE_NAME = 'router-leave-pwa-v1';

// ตัวเว็บเอง (App shell local)
const CORE_ASSETS = [
  './',
  './index.html',
  './js/app.js',
  './css/styles.css',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-180.png',
  './icons/icon-maskable-512.png'
];

// สคริปต์/ฟอนต์จากภายนอก ตามที่ index.html โหลดอยู่ (จำเป็นต้องแคช เพื่อเปิด offline ได้)
const CDN_ASSETS = [
  'https://www.gstatic.com/firebasejs/13.0.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/13.0.0/firebase-analytics-compat.js',
  'https://www.gstatic.com/firebasejs/13.0.0/firebase-database-compat.js',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700;800&display=swap'
];

function isSkipList(url) {
  return (
    url.hostname.endsWith('firebaseio.com') ||
    url.hostname.endsWith('firebasedatabase.app') ||
    url.hostname.endsWith('googleapis.com') ||
    url.hostname.endsWith('pages.dev') ||
    url.hostname === 'accounts.google.com' ||
    url.protocol === 'ws:' || url.protocol === 'wss:' ||
    url.pathname.startsWith('/v1beta1/')
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // 1) แคช core shell ทั้งหมด (ทุกไฟล์จะต้องได้จริงๆ)
    try {
      await cache.addAll(CORE_ASSETS);
    } catch (err) {
      console.warn('[SW] core precache incomplete:', err);
    }
    // 2) แคชแบบ CDN กันสะสมเลยพลาดบ้าง (no-cors กันจะพาลได้ resource เป็น opaque response ได้)
    await Promise.allSettled(CDN_ASSETS.map(async (url) => {
      try {
        const resp = await fetch(url, { mode: 'no-cors', credentials: 'omit' });
        await cache.put(url, resp);
      } catch (err) {
        console.warn('[SW] CDN precache failed:', url, err);
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (!/^https?:$/.test(url.protocol)) return;
  if (isSkipList(url)) return;

  // --- Navigation: Network-first (พยายามไปที่เว็บจริงก่อน ถ้ามีปัญหา fallback เป็นแคช) ---
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const fresh = await fetch(req);
        cache.put('./', fresh.clone()).catch(() => {});
        return fresh;
      } catch (err) {
        const cached = (await cache.match('./')) ||
                       (await cache.match('./index.html')) ||
                       (await cache.match(req, { ignoreSearch: true }));
        if (cached) return cached;
        throw err;
      }
    })());
    return;
  }

  // --- Static (local + CDN): Stale-While-Revalidate (ตอบจากแคชทันที + อัปเดตเบื้องหลัง) ---
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req, { ignoreSearch: false });
    const networkPromise = (async () => {
      try {
        const fresh = await fetch(req);
        try { await cache.put(req, fresh.clone()); } catch (err) {}
        return fresh;
      } catch (err) {
        return null;
      }
    })();
    if (cached) {
      event.waitUntil(networkPromise);
      return cached;
    }
    const fresh = await networkPromise;
    if (fresh) return fresh;
    return new Response('', { status: 504, statusText: 'offline' });
  })());
});

// ระบบเฝ้าข้อความ 'SKIP_WAITING' จากคลายเอ็น (สำรองพื้นที่สำหรับควบคุม upgrade ในอนาคตได้)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
