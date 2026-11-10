/**
 * คลังความรู้แมวอักษร: รับเรื่องจากหน้า "เล่าให้ทีมฟัง" ลงชีต (Google Apps Script)
 * (รวมถึงปุ่ม "เห็น(ชื่อแมว)วันนี้" ในหน้าแมว และปุ่ม "เรื่องนี้ช่วยได้ไหม?" ท้ายบทความ ซึ่งส่งเข้ามาเป็นแถวสั้น ๆ)
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
 * เปิดรับรูปจากในหน้าเว็บ (ไม่บังคับ):
 *  - โค้ดส่วนรูปใช้ DriveApp จึงต้องมีสิทธิ์ Drive (appsscript.json → oauthScopes มี .../auth/drive)
 *  - เจ้าของสคริปต์เปิดตัวแก้ไข → เรียกใช้ setup อีกครั้ง → อนุญาตสิทธิ์ Drive
 *    (บันทึกการทำงานจะแสดงลิงก์โฟลเดอร์ "รูปที่ส่งเข้ามา" ในไดรฟ์ของเจ้าของ)
 *  - Deploy → จัดการการทำให้ใช้งานได้ → แก้ไข → เวอร์ชันใหม่ (URL /exec เดิมใช้ต่อได้)
 *  - ใน config.js ตั้ง PHOTO_UPLOAD: true แล้ว push ขึ้นเว็บ
 *  รูปถูกย่อในเบราว์เซอร์เหลือด้านยาวไม่เกิน 1280px ก่อนส่ง เก็บเป็นไฟล์ส่วนตัวในโฟลเดอร์นั้น
 *  ช่อง "ลิงก์รูป" ในชีตจะเป็นลิงก์ไฟล์ ถ้าบันทึกรูปไม่สำเร็จ เรื่องที่ส่งมายังเข้าชีตตามปกติพร้อมหมายเหตุ
 *
 * ทุกเรื่องเข้าแท็บ "Submissions" สถานะเริ่มต้น "รอตรวจ"
 * ผู้ดูแลเนื้อหาตรวจแล้วค่อยคัดลอกไปใส่ชีตข้อมูลจริง และเปลี่ยนสถานะเป็น "เผยแพร่แล้ว" หรือ "ไม่เผยแพร่"
 */
const TAB = "Submissions";
const TITLE = "คลังความรู้แมวอักษร · เรื่องที่ส่งเข้ามา (รอตรวจ)";
const HEADERS = ["เวลา", "ประเภท", "แมว", "รายละเอียด", "สถานที่", "ลิงก์รูป", "ชื่อผู้ส่ง (เครดิต)", "ช่องทางติดต่อ", "อนุญาตให้เผยแพร่", "ส่งจากหน้า", "สถานะ"];
const MAX = 2000; // ตัดข้อความยาวเกิน กันสแปม
const PHOTO_FOLDER = "คลังความรู้แมวอักษร · รูปที่ส่งเข้ามา";
const PHOTO_MAX = 3 * 1024 * 1024; // ความยาว base64 สูงสุด (~2.2 MB หลังถอดรหัส) รูปที่ย่อแล้วใช้ไม่ถึง

function doPost(e) {
  const p = (e && e.parameter) || {};
  // honeypot: real people never fill the hidden "website" field
  if (p.website) return reply({ ok: true });
  const message = clip(p.message);
  if (!message) return reply({ ok: false, error: "empty" });

  // a photo sent from the page (base64 JPEG) goes to the owner's Drive; the sheet keeps its link
  let photo = clip(p.photo);
  if (p.photoData) {
    const saved = savePhoto(p.photoData, p.photoName, p.cat);
    photo = saved.url || (photo ? photo + " · " : "") + "(มีรูปแนบแต่บันทึกไม่สำเร็จ: " + saved.error + ")";
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    getSheet().appendRow([
      new Date(), clip(p.type), clip(p.cat), message, clip(p.place), photo,
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
  try {
    Logger.log("โฟลเดอร์รูป: " + getPhotoFolder().getUrl());
  } catch (err) {
    Logger.log("ยังไม่ได้เปิดรับรูป (ไม่มีสิทธิ์ Drive): " + err);
  }
}

function getPhotoFolder() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty("PHOTO_FOLDER_ID");
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (err) { /* deleted: make a new one */ }
  }
  const folder = DriveApp.createFolder(PHOTO_FOLDER);
  props.setProperty("PHOTO_FOLDER_ID", folder.getId());
  return folder;
}

function savePhoto(data, name, cat) {
  try {
    const b64 = String(data).replace(/^data:image\/\w+;base64,/, "");
    if (b64.length > PHOTO_MAX) return { error: "ไฟล์ใหญ่เกิน" };
    const bytes = Utilities.base64Decode(b64);
    // JPEG only (the page converts every photo to JPEG before sending)
    if (bytes.length < 4 || (bytes[0] & 255) !== 0xFF || (bytes[1] & 255) !== 0xD8) return { error: "ไม่ใช่ไฟล์รูป JPEG" };
    const stamp = Utilities.formatDate(new Date(), "Asia/Bangkok", "yyyy-MM-dd_HHmmss");
    const safe = String(cat || name || "cat").replace(/[\/:*?"<>|\s]+/g, "-").slice(0, 40) || "cat";
    const file = getPhotoFolder().createFile(Utilities.newBlob(bytes, "image/jpeg", stamp + "_" + safe + ".jpg"));
    return { url: file.getUrl() };
  } catch (err) {
    return { error: String(err && err.message || err).slice(0, 120) };
  }
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
