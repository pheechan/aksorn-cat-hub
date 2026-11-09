/**
 * คลังความรู้แมวอักษร: รับเรื่องจากหน้า "แบ่งปันความรู้" ลงชีต (Google Apps Script)
 *
 * ตั้งค่าครั้งเดียว (ประมาณ 5 นาที):
 *  1. เปิด Google Sheet ของทีม (หรือสร้างชีตใหม่) → เมนู ส่วนขยาย (Extensions) → Apps Script
 *  2. ลบโค้ดเดิม วางโค้ดทั้งไฟล์นี้ → บันทึก
 *  3. กด ทำให้ใช้งานได้ (Deploy) → การทำให้ใช้งานได้รายการใหม่ (New deployment)
 *     ประเภท: เว็บแอป (Web app) · เรียกใช้ในฐานะ: ฉัน (Me) · ผู้ที่มีสิทธิ์เข้าถึง: ทุกคน (Anyone)
 *  4. อนุญาตสิทธิ์ แล้วคัดลอก URL ที่ลงท้ายด้วย /exec
 *  5. วาง URL ใน config.js ช่อง SUBMIT_URL แล้ว push ขึ้นเว็บ
 *
 * ทุกเรื่องจะไปอยู่ในแท็บ "Submissions" สถานะเริ่มต้น "รอตรวจ"
 * ผู้ดูแลเนื้อหาตรวจแล้วค่อยคัดลอกไปใส่แท็บข้อมูลจริง และเปลี่ยนสถานะเป็น "เผยแพร่แล้ว" หรือ "ไม่เผยแพร่"
 */
const TAB = "Submissions";
const HEADERS = ["เวลา", "ประเภท", "แมว", "รายละเอียด", "สถานที่", "ลิงก์รูป", "ชื่อผู้ส่ง (เครดิต)", "ช่องทางติดต่อ", "อนุญาตให้เผยแพร่", "ส่งจากหน้า", "สถานะ"];
const MAX = 2000; // ตัดข้อความยาวเกิน กันสแปม

function doPost(e) {
  const p = (e && e.parameter) || {};
  // honeypot: real people never fill the hidden "website" field
  if (p.website) return reply({ ok: true });
  const message = clip(p.message);
  if (!message) return reply({ ok: false, error: "empty" });

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSheet();
    sheet.appendRow([
      new Date(), clip(p.type), clip(p.cat), message, clip(p.place), clip(p.photo),
      clip(p.name), clip(p.contact), p.consent === "yes" ? "อนุญาต" : "ไม่อนุญาต", clip(p.page), "รอตรวจ"
    ]);
  } finally {
    lock.releaseLock();
  }
  return reply({ ok: true });
}

// เปิด URL ในเบราว์เซอร์เพื่อทดสอบว่าทำงาน
function doGet() {
  return reply({ ok: true, service: "aksorn-cat-hub submissions" });
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(TAB);
  if (!sheet) {
    sheet = ss.insertSheet(TAB);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function clip(v) {
  // prevent spreadsheet formula injection from user text
  let s = String(v == null ? "" : v).slice(0, MAX).trim();
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
