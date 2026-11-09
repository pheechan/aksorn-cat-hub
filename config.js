// ============================================================
//  ตั้งค่าเว็บไซต์ — แก้ไฟล์นี้ไฟล์เดียวพอ ไม่ต้องแตะโค้ดส่วนอื่น
//  Site settings — this is the only file you need to edit.
//  ข้อความภาษาอังกฤษอยู่ในช่อง en / *_EN ข้างแต่ละรายการ · English text sits in the en / *_EN fields
//  คำแปลของข้อความในชีตและบทความอยู่ใน content-en.js
// ============================================================
window.SITE_CONFIG = {
  SITE_TITLE: "คลังความรู้แมวอักษร",
  SITE_TITLE_EN: "Aksorn Cat Knowledge Hub",
  SITE_SUBTITLE: "สมุดความรู้ของผู้ดูแลแมว คณะอักษรศาสตร์ จุฬาลงกรณ์มหาวิทยาลัย",

  // ---- ข้อมูลจาก Google Sheet ของทีม (ชีตต้องแชร์แบบ "ทุกคนที่มีลิงก์ดูได้") ----
  // แท็บ Cat_profile: แก้ในชีตแล้วเว็บอัปเดตเองภายในไม่กี่นาที
  SHEET_CSV_URL: "https://docs.google.com/spreadsheets/d/1LFBVHk6D9GHRL2BPJldPS-qql6UkGWmlpr8B-0B1J70/gviz/tq?tqx=out:csv&sheet=Cat_profile",
  ARTICLES_CSV_URL: "",   // (ไม่บังคับ) แท็บ articles — เว้นว่าง = ใช้บทความใน data-sample.js
  HISTORY_CSV_URL: "",    // (ไม่บังคับ) แท็บ history — เว้นว่าง = ใช้ประวัติใน data-sample.js

  // ---- ช่องทางรับเรื่องจากผู้ใช้ (พื้นที่แบ่งปันความรู้) ----
  // ลิงก์ Web app ของ Google Apps Script ที่บันทึกลงชีตรับเรื่องแยกส่วนตัว (ดู README / tools/submissions.gs)
  // ตั้งแล้ว ฟอร์มในหน้า "แบ่งปันความรู้" จะส่งเรื่องเข้าชีตทันที สถานะ "รอตรวจ"
  SUBMIT_URL: "https://script.google.com/macros/s/AKfycbxb93rl03hfs-TmaK5kwvDq4O8nCbUBmHYlxfN-HxLPMCu3uVx3n0YFfhu1gJAgvaMEVA/exec",

  // ---- ข้อมูลเสริมที่ชีตยังไม่มีคอลัมน์ ----
  // สีขนระบุจากรูปถ่ายในโฟลเดอร์ Drive ของทีม (ถ้าเพิ่มคอลัมน์ "สีขน" ในชีต ค่าในชีตจะใช้แทน)
  // สีขนที่ใช้ได้: orange ส้ม · black ดำ · bicolor ขาวดำ · white ขาว · calico สามสี/กระดองเต่า · tabby เทา/ลายสลิด · cream ครีม
  // "normal" = ปกติแมวตัวนี้เป็นอย่างไร (เวลากิน ที่นอน นิสัย) ใส่เมื่อผู้ดูแลยืนยันแล้ว หรือเพิ่มคอลัมน์ "ปกติ" ในชีต
  CAT_EXTRA: {
    "กระทง": { coat: "cream" },
    "กะตั้ว": { coat: "tabby" },
    "ชาโคล": { coat: "bicolor" },
    "ชาบู": { coat: "black" },
    "ชาลาเต้": { coat: "bicolor" },
    "ซูชิ": { coat: "tabby" },
    "ใบบุญ": { coat: "calico" },
    "มีตัง": { coat: "bicolor" },
    "มีบุญ": { coat: "calico" },
    "ส้มส้ม": { coat: "orange" },
    "หนูดำ": { coat: "black" }
  },

  // รูปแมวมาจากโฟลเดอร์ Google Drive ที่ลิงก์ไว้ในช่อง Photo ของชีต → รัน python -I tools/sync_photos.py
  // ช่องนี้ใช้เพิ่มรูปเองแบบเฉพาะกิจ เช่น { "ชื่อแมว": "photos/ไฟล์.jpg" }
  CAT_PHOTOS: {},

  // ---- คำพูดของผู้ดูแล (ยกมาตามบันทึกสัมภาษณ์ในชีต ไม่ได้แต่งเพิ่ม) ----
  KEEPER_QUOTES: [
    { text: "จำแมวจากหน้า", context: "ผู้ดูแลแมวในคณะ เมื่อถามว่าแยกแมวแต่ละตัวออกได้อย่างไร", href: "#/find", cta: "ลองหาแมวจากสีขนและที่ที่เจอ",
      en: { text: "I know the cats by their faces", context: "A keeper, asked how they tell the cats apart", cta: "Find a cat by coat and place" } },
    { text: "ปกติเจอก็จะเอามานี่ก่อน ฉีดวัคซีน หยอดยาเห็บหมัด ถ่ายพยาธิ ถ้าโตก็ทำหมัน แล้วให้นิสิตช่วยหาบ้าน", context: "ผู้ดูแลเล่าว่าทำอะไรเมื่อพบแมวหลง", href: "#/article/a07", cta: "อ่านเรื่องเต็ม",
      en: { text: "When we find one we usually bring it here first: vaccines, flea drops, deworming, spaying once it's grown, then students help find it a home", context: "A keeper on what happens when a stray is found", cta: "Read the full story" } },
    { text: "บางทีก็เดินไปโรงรถ เครียด ๆ หนี โลกส่วนตัวสูง", context: "ผู้ดูแลเล่าถึงหนูดำ", href: "#/article/a08", cta: "ถ้าหนูดำหายไป ควรทำอย่างไร",
      en: { text: "Sometimes she wanders off to the garage. Slips away when stressed. Very much keeps to herself.", context: "A keeper on Nu Dam", cta: "If Nu Dam goes missing, what to do" } },
    { text: "ส่วนใหญ่เดินวนอยู่คณะนี่ล่ะ", context: "ผู้ดูแลเล่าว่าแมวของคณะใช้ชีวิตอยู่ที่ไหน", href: "#/cats", cta: "ดูว่าแมวแต่ละตัวอยู่ตรงไหน",
      en: { text: "Mostly they just wander around the faculty", context: "A keeper on where the faculty's cats spend their days", cta: "See where each cat stays" } }
  ],

  // ---- บทบาทในชุมชนผู้ดูแล (Wenger et al., 2002) — ทีมกรอกชื่อจริงเมื่อมีผู้รับหน้าที่ ----
  ROLES: [
    { role: "ผู้ประสานงานกลาง", who: "ทีมผู้จัดทำโครงการ (ชั่วคราว)", duty: "เชื่อมผู้ดูแลใหม่กับผู้ดูแลเดิม นัดไปให้อาหารด้วยกัน และชวนสมาชิกแบ่งปันความรู้",
      en: { role: "Coordinator", who: "The project team (for now)", duty: "Connects new keepers with experienced ones, arranges feeding rounds together, and encourages members to share what they know" } },
    { role: "ผู้ดูแลเนื้อหา", who: "ทีมผู้จัดทำโครงการ (ชั่วคราว)", duty: "ตรวจเรื่องที่ส่งเข้ามาก่อนเผยแพร่ แก้ข้อมูลในชีต และทบทวนความทันสมัยทุกภาคเรียน",
      en: { role: "Content steward", who: "The project team (for now)", duty: "Reviews submissions before they are published, corrects the sheet, and checks everything is up to date each semester" } }
  ],

  // ---- ติดต่อกรณีแมวป่วยหรือบาดเจ็บ ----
  // ใส่เฉพาะข้อมูลที่ตรวจสอบแล้ว รายการที่ value ว่างจะไม่แสดง
  EMERGENCY_CONTACTS: [
    { label: "โรงพยาบาลสัตว์เล็กเพื่อการเรียนการสอน คณะสัตวแพทยศาสตร์ จุฬาฯ", value: "ในจุฬาฯ ถนนอังรีดูนังต์ · โทรสอบถามเวลาทำการก่อนพาไป", href: "https://www.chula.ac.th/services/small-animal-teaching-hospital/",
      en: { label: "Small Animal Teaching Hospital, Faculty of Veterinary Science, Chula", value: "On campus, Henri Dunant Road · call to check opening hours before you go" } },
    { label: "ผู้ดูแลแมวในคณะ", value: "", en: { label: "The faculty's cat keepers" } },
    { label: "LINE OpenChat ผู้ดูแลแมวอักษร", value: "", en: { label: "Aksorn cat keepers' LINE OpenChat" } }
  ],

  // ขอบคุณผู้ให้ความรู้ (ขออนุญาตก่อนใส่ชื่อ)
  CREDITS_KNOWLEDGE_HOLDERS: [
    "ผู้ดูแลแมวและบุคลากรคณะอักษรศาสตร์ที่ให้สัมภาษณ์"
  ],
  CREDITS_KNOWLEDGE_HOLDERS_EN: [
    "The cat keepers and Faculty of Arts staff who gave interviews"
  ],
  CREDITS_TEAM: [
    "สมาชิกกลุ่ม 1", "สมาชิกกลุ่ม 2", "สมาชิกกลุ่ม 3"
  ],
  CREDITS_TEAM_EN: [
    "Group member 1", "Group member 2", "Group member 3"
  ],
  COURSE: "รายวิชา 2206437 การจัดการความรู้ในองค์กร ภาคต้น ปีการศึกษา 2569",
  COURSE_EN: "Course 2206437 Knowledge Management in Organizations, first semester, academic year 2026",

  // URL จริงของเว็บ (ใช้สร้าง QR)
  SITE_URL: "https://pheechan.github.io/aksorn-cat-hub/"
};
