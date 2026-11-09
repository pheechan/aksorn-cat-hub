/**
 * คลังความรู้แมวอักษร: รับเรื่องจากหน้า "แบ่งปันความรู้" ลงชีต (Google Apps Script)
 *
 * เรื่องที่ส่งเข้ามาเก็บใน "ชีตแยก" ที่เป็นส่วนตัวของเจ้าของสคริปต์ ไม่ใช่ชีตข้อมูลแมวของทีม
 * เพราะชีตข้อมูลแมวเปิดให้ทุกคนที่มีลิงก์เข้าถึงได้ แต่เรื่องที่ส่งมามีชื่อและช่องทางติดต่อของผู้ส่ง
 * แชร์ชีตแยกนี้เฉพาะกับผู้ดูแลเนื้อหาที่ต้องตรวจทาน
 *
 * ตั้งค่าครั้งเดียว:
 *  1. script.google.com → โปรเจกต์ใหม่ → วางโค้ดไฟล์นี้ → บันทึก
 *  2. เลือกฟังก์ชัน setup → เรียกใช้ → อนุญาตสิทธิ์ (บันทึกการทำงานจะแสดงลิงก์ชีตที่สร้างให้)
 *  3. ทำให้ใช้งานได้ (Deploy) → รายการใหม่ → เว็บแอป · เรียกใช้ในฐานะ: ฉัน · ผู้มีสิทธิ์: ทุกคน
 *  4. คัดลอก URL ที่ลงท้ายด้วย /exec ไปใส่ใน config.js ช่อง SUBMIT_URL แล้ว push ขึ้นเว็บ
 *
 * ทุกเรื่องเข้าแท็บ "Submissions" สถานะเริ่มต้น "รอตรวจ"
 * ผู้ดูแลเนื้อหาตรวจแล้วค่อยคัดลอกไปใส่ชีตข้อมูลจริง และเปลี่ยนสถานะเป็น "เผยแพร่แล้ว" หรือ "ไม่เผยแพร่"
 */
const TAB = "Submissions";
const TITLE = "คลังความรู้แมวอักษร · เรื่องที่ส่งเข้ามา (รอตรวจ)";
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
    getSheet().appendRow([
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

// เรียกครั้งแรกจากหน้า Apps Script เพื่ออนุญาตสิทธิ์และสร้างชีต
function setup() {
  const sheet = getSheet();
  Logger.log("ชีตรับเรื่อง: " + sheet.getParent().getUrl());
}

function getSheet() {
  const props = PropertiesService.getScriptProperties();
  let ss = null;
  const id = props.getProperty("SHEET_ID");
  if (id) {
    try { ss = SpreadsheetApp.openById(id); } catch (err) { ss = null; }
  }
  if (!ss) {
    ss = SpreadsheetApp.create(TITLE);
    props.setProperty("SHEET_ID", ss.getId());
  }
  let sheet = ss.getSheetByName(TAB);
  if (!sheet) {
    sheet = ss.getSheets()[0];
    sheet.setName(TAB);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
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
