// ============================================================
//  ตั้งค่าเว็บไซต์ — แก้ไฟล์นี้ไฟล์เดียวพอ ไม่ต้องแตะโค้ดส่วนอื่น
//  Site settings — this is the only file you need to edit.
// ============================================================
window.SITE_CONFIG = {
  SITE_TITLE: "คลังความรู้แมวอักษร",
  SITE_TITLE_EN: "Aksorn Cat Knowledge Hub",
  SITE_SUBTITLE: "คลังความรู้เรื่องแมวในคณะอักษรศาสตร์ จุฬาลงกรณ์มหาวิทยาลัย",

  // ---- Google Sheet: แต่ละแท็บ Publish to web เป็น CSV แยกกัน (ดู README) ----
  // เว้นว่าง = ใช้ข้อมูลตัวอย่างใน data-sample.js
  // แท็บ Cat_profile ในชีตของทีม (ชีตต้องแชร์แบบ "ทุกคนที่มีลิงก์ดูได้") แก้ในชีตแล้วเว็บอัปเดตเอง
  SHEET_CSV_URL: "https://docs.google.com/spreadsheets/d/1LFBVHk6D9GHRL2BPJldPS-qql6UkGWmlpr8B-0B1J70/gviz/tq?tqx=out:csv&sheet=Cat_profile",
  ARTICLES_CSV_URL: "",   // แท็บ articles (คลังความรู้)
  HISTORY_CSV_URL: "",    // แท็บ history (ประวัติการดูแล)

  // ---- Google Forms ----
  // ฟอร์มแจ้งข่าวแมว: เห็นแมว แมวป่วย แมวตัวใหม่ ข้อมูลผิด
  FORM_URL: "",
  // (ไม่บังคับ) entry id ของคำถาม "ชื่อแมว" เพื่อให้ฟอร์มกรอกชื่อให้อัตโนมัติ เช่น "entry.123456789"
  FORM_CAT_ENTRY: "",
  // ฟอร์มแบ่งปันความรู้: ส่งบทความ เคล็ดลับ หรือประสบการณ์การดูแลแมว (ผ่านการตรวจก่อนเผยแพร่)
  SHARE_FORM_URL: "",

  // รูปแมวที่เก็บไว้กับเว็บ (ใช้เมื่อช่อง Photo ในชีตไม่ใช่ลิงก์รูป) — ชื่อต้องตรงกับช่อง Name ในชีต
  CAT_PHOTOS: {
    "ส้มส้ม": "photos/somsom.jpg",
    "ชาโคล": "photos/charcoal.jpg",
    "มีตัง": "photos/mitang.jpg"
  },

  // URL จริงของเว็บหลังขึ้น GitHub Pages เช่น "https://yourname.github.io/arts-cats/" (ใช้สร้าง QR)
  SITE_URL: "https://pheechan.github.io/aksorn-cat-hub/",

  // ข้อมูลติดต่อกรณีฉุกเฉิน — ตรวจสอบให้ถูกต้องก่อนเผยแพร่จริง!
  EMERGENCY_CONTACTS: [
    { label: "ผู้ดูแลแมวในคณะ (ตัวแทนกลุ่ม)", value: "ยังไม่ได้กรอก" },
    { label: "โรงพยาบาลสัตว์เล็ก คณะสัตวแพทยศาสตร์ จุฬาฯ", value: "ยังไม่ได้กรอก — ตรวจสอบเบอร์และเวลาทำการก่อนเผยแพร่" },
    { label: "LINE OpenChat คนรักแมวอักษร", value: "ยังไม่ได้กรอก" }
  ],

  // ขอบคุณผู้ให้ความรู้ (ขออนุญาตก่อนใส่ชื่อ)
  CREDITS_KNOWLEDGE_HOLDERS: [
    "พี่แม่บ้าน/พี่ภารโรงคณะอักษรศาสตร์ (ใส่ชื่อเมื่อได้รับอนุญาต)"
  ],
  CREDITS_TEAM: [
    "สมาชิกกลุ่ม 1", "สมาชิกกลุ่ม 2", "สมาชิกกลุ่ม 3"
  ],
  COURSE: "รายวิชา 2206437 การจัดการความรู้ในองค์กร ภาคต้น ปีการศึกษา 2569"
};
