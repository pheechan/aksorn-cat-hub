/* English versions of the hub's content, for the Thai/English switch (see i18n.js).
   - names: how each cat's name is written in English (the Thai name is always shown next to it).
   - text: translations keyed by the exact Thai text in the team's sheet. If the team edits the Thai,
     the key no longer matches and the site shows the new Thai (marked as Thai) instead of an old translation.
     To translate new sheet text, add "the Thai exactly as typed": "English" below.
   - articles: English versions of the articles in data-sample.js, by article id.
   Translated by the project team; keepers' words are translated as closely as possible and the Thai original stays available. */
window.CONTENT_EN = {
  names: {
    "กระทง": "Krathong", "กะตั้ว": "Katua", "กระตั้ว": "Katua", "มีตังค์": "Meetang", "ชาโคล": "Charcoal", "ชาด้า": "Chada", "ชาบู": "Shabu",
    "ชาลาเต้": "Cha Latte", "ซูชิ": "Sushi", "ใบบุญ": "Baibun", "มีตัง": "Meetang", "มีบุญ": "Meebun",
    "ส้มส้ม": "Som-Som", "หนูดำ": "Nu Dam", "อาหลง": "A-Long", "ตีตี้": "Titi", "ตาต้า": "Tata",
    "แพนด้า": "Panda", "ทาโร่": "Taro", "กระรอก": "Krarok"
  },

  text: {
    // ages
    "10 กว่า": "10+ years", "ปีกว่า": "a little over a year", "ปีนึง": "about a year",
    "4 ปี": "4 years", "6 เดือน": "6 months",
    // personality
    "เป็นมิตร เข้าหาได้": "Friendly, fine to approach", "ไม่ชอบให้จับ": "Doesn't like being touched", "ขี้อาย": "Shy", "เข้าหาอย่างระวัง": "Approach with care",
    // usual places
    "สโตร์แม่บ้าน": "Housekeepers' store room", "MCS": "MCS building", "มาบ้างไม่มาบ้าง": "Comes and goes",
    "รปภ. BRK ชั้น 1": "Security post, BRK 1st floor", "ขังกรง": "Kept in a cage", "ชั้น 3 BRK": "BRK 3rd floor",
    "เทวาลัย": "Thewalai (Maha Chulalongkorn Building)", "ออฟฟิศชั้น 2 BRK": "Office, BRK 2nd floor",
    // marks, health, notes
    "มอม แก่แล้ว มองไม่ค่อยเห็น ฟันไม่ค่อยมี": "Scruffy and old; can't see well and has few teeth left",
    "เคยหนีไปวิดวะ หลายวันอยู่ เป็น 10-15 วัน บางทีก็เดินไปโรงรถ เครียด ๆ หนี โลกส่วนตัวสูง": "Once ran off to the Engineering faculty for 10–15 days. Sometimes wanders off to the garage; slips away when stressed. Very much keeps to herself.",
    "ยังไม่เคยเห็น": "Not seen yet", "หาไม่เจอ": "Can't be found", "เคยมีลูก": "Has had kittens before",
    "อาจมีโรคประจำตัว": "May have a chronic condition", "ไต": "Kidney problems",
    "ตามองไม่ค่อยเห็น ไม่มีฟัน": "Poor eyesight, no teeth", "แมวหลงมา อาจารย์เก็บมา": "A stray; a lecturer took her in",
    // family
    "พี่น้องส้มส้ม": "Sibling of Som-Som", "พี่น้องทาโร่": "Sibling of Taro", "พี่น้องกับมีตัง": "Sibling of Meetang",
    "พี่น้องกับใบบุญ": "Sibling of Baibun", "พี่น้องกับชาร์โคล": "Sibling of Charcoal", "พี่่น้องชาลาเต้": "Sibling of Cha Latte",
    // caretakers
    "พี่ปลา หัวหน้าสาว (ลุงทง)": "P'Pla, Chief Sao (Uncle Thong)",
    // keepers' interview notes (translated as closely as possible)
    "หัวหน้าสาวไปเก็บมา อาจารย์ไปเก็บมา จากสวนร้อยบ้างอะไรบ้าง ชาบูมีบุญแมวหลง ปกติเจอก็จะเอามานี่ก่อน ฉีดวัคซีน หยอดยาเห็บหมัดถ่ายพยาธิ ถ้าโตก็ทำหมัน แล้วให้นิสิตช่วยหาบ้าน ตัวที่อยู่ที่นี่คือเป็นของอักษรแล้ว กระตั้ว กระทง ชาบู มีบุญ ใบบุญ หนูนำ อักษร Native":
      "Chief Sao picked them up, lecturers picked them up, some from the Centenary Park and so on. Shabu and Meebun were strays. When we find one we usually bring it here first: vaccines, flea drops, deworming, spaying once it's grown, then students help find it a home. The ones who live here already belong to Arts: Katua, Krathong, Shabu, Meebun, Baibun, Nu Dam. Arts natives.",
    "ทีเหลือเป็นของคณะอักษรเลย6ตัว อาจารย์ คณบดีให้เลี้ยงไว้ ให้เลี้ยงไว้":
      "The rest, six of them, belong to the Faculty of Arts outright. The lecturers and the dean let us keep them.",
    "จำแมวจากหน้า": "I know the cats by their faces",
    "ส่วนใหญ่เดินวนอยู่คณะนี่ล่ะ": "Mostly they just wander around the faculty",
    "อจ.ให้เลี้ยง คณะบดีให้เลี้ยง แต่ก็ให้เลี้ยงแค่นี้ก่อน ตอนแรกมี 7 ตัว (กระรอก สีส้มอ้วน ๆ อยู่กับลุงทงเมื่อก่อน จับไม่ได้ ไม่ดุ แต่ดื้อ ไม่ฉีดวัคซีน)":
      "The lecturers and the dean let us keep them, but only this many for now. At first there were seven (Krarok, a chubby orange cat who used to stay with Uncle Thong: couldn't be picked up, not aggressive but stubborn, never vaccinated).",
    "ให้แมวเลียได้ทุกตัว ปกติหัวหน้าสาวเก็บมา มีคนเรึยกไปเก็บ สีตัวเล็กมาจากสวย100ปี พี่ปลา หัวหน้าสาวอยู่กับลุงทง":
      "Every cat can have lickable cat treats. Usually Chief Sao picks them up; people call her to come and collect them. The little ones came from the Centenary Park. P'Pla and Chief Sao are with Uncle Thong.",
    "อาหารได้จากอาจารย์ คณบดี": "Their food comes from the lecturers and the dean",
    "มีทำป้ายชื่อแขวนติดกับปลอกคอ ปกติจำได้อยู่แล้ว สีขนต่าง": "Some have name tags hanging from their collars. We can usually tell them apart anyway; their coats are different.",
    "ยา ได้จากชมรมสัตวแพทย์ของนิสิตแพทย์": "Medicine comes from the students' veterinary club",
    // care history
    "โพสต์แนะนำสมาชิกใหม่ “น้องส้มส้ม” ตอนยังเป็นลูกแมว พบที่ BRK ชั้น 3 หน้าห้องน้ำหญิง": "Post introducing a new member, “Som-Som”, as a kitten, found on BRK 3rd floor outside the women's restroom",
    "ได้ใส่ปลอกคอแล้ว": "Got a collar",
    "โพสต์แนะนำ “น้องชาโคล” ลูกแมวขาวดำ อยู่ BRK ชั้น 1 หลังบันไดฝั่งตู้เต่าบิน": "Post introducing “Charcoal”, a black-and-white kitten living on BRK 1st floor behind the stairs by the Tao Bin vending machine",
    "ปรากฏในโพสต์ “มีตังค์ ❤️ box” (ภาพโดย @apt_bright_b)": "Appeared in the post “Meetang ❤️ box” (photo by @apt_bright_b)"
  },

  articles: {
    a01: {
      title: "Feeding the faculty's cats: enough, and not twice",
      summary: "One cat can be fed by several people in a day. Without coordinating, cats put on weight and leftovers attract ants.",
      body: "The faculty's cats are loved by many people, so the usual problem isn't a hungry cat but a cat fed several times by different people.\n\n## Before you feed\n- Check that cat's page first. Some have notes about weight or food.\n- Ask the main keeper whether it has already been fed today.\n- Feed only at the spots agreed with the faculty, never in classrooms or the library.\n\n## What not to give\n- Cow's milk. Many adult cats can't digest lactose and get diarrhoea.\n- Human food containing onion, garlic or chocolate.\n- So many treats that the cat stops eating its main food.\n\n## After feeding\nClear away leftover wet food within about half an hour, and always keep clean water out.",
      tags: "food, weight, milk", author: "Knowledge hub team", source: "Draft, waiting for a keeper or vet to review"
    },
    a02: {
      title: "Signs that a cat may be unwell",
      summary: "Symptoms to report to a keeper straight away, and what not to do yourself.",
      body: "Cats tend to hide illness, so the people who see them every day are the ones who can help most. If a cat is different from how it usually is, note it down and report it.\n\n## Report straight away\n- Not eating for more than a day\n- Struggling to breathe, or breathing through the mouth\n- Vomiting or diarrhoea again and again\n- A wound, limping, or not getting up\n- Unusually dull or hiding\n\n## What to do\n- Take a photo and note the time and place.\n- Report it through the form on this site, and contact a keeper or a vet.\n\n## What not to do\nNever give human medicine. Some, such as paracetamol, are seriously toxic to cats. This hub doesn't diagnose illness; if you're unsure, ask a vet.",
      tags: "sick, emergency, medicine", author: "Knowledge hub team", source: "Draft, waiting for a vet to review"
    },
    a03: {
      title: "Why spay and neuter, and how to tell which cats are done",
      summary: "Spaying and neutering keeps the number of cats in the faculty under control and means fewer fights.",
      body: "One female cat can have several litters a year. Without spaying, the number of cats grows faster than the keepers can manage.\n\n## How to tell if a cat has been done\nMany programmes clip the tip of an ear on cats that have been spayed or neutered, but not every cat has it. Check the cat's page in the hub first.\n\n## If you see a cat that hasn't been done\nTell the main keeper through the form. Don't take the cat yourself: going for surgery has to be arranged with the keepers and a vet.",
      tags: "spay, neuter, ear tip, TNR", author: "Knowledge hub team", source: "Draft, waiting for a vet to review"
    },
    a04: {
      title: "Read a cat's body language before reaching out",
      summary: "The tail, ears and eyes tell you whether a cat wants you near.",
      body: "Each cat in the faculty has its own personality. Check the personality on its page, and watch how it's acting right in front of you.\n\n## A cat that's open to you\n- Tail straight up, the tip slightly curled\n- Walks over and rubs against your legs\n- Blinks slowly at you\n\n## A cat that wants to be left alone\n- Ears flat back, hissing, or a puffed-up tail\n- Tail lashing hard\n- Backing away or crouching low\n\n## How to approach\nCrouch down low and hold out a hand for the cat to sniff first. If it doesn't come to you, let it be. Don't pick up a cat you don't know.",
      tags: "body language, handling, scratches", author: "Knowledge hub team", source: "Draft, waiting for a keeper to review"
    },
    a05: {
      title: "Wash your hands, clear the bowls, look after the feeding spots",
      summary: "Clean feeding spots are good for the cats, for people, and for the cats' welcome in the faculty.",
      body: "If feeding spots get dirty, attract ants or smell, the faculty may not want cats around. Keeping them clean is everyone's job.\n\n- Wash your hands after touching a cat, especially before eating.\n- Wash food and water bowls every day.\n- Throw bags and scraps into a bin with a lid.\n- Don't feed on stairs or in busy walkways.\n- If you're scratched or bitten, wash the wound with clean water and soap, then see a doctor.",
      tags: "cleanliness, bowls, hand washing", author: "Knowledge hub team", source: "Draft, waiting for a keeper to review"
    },
    a07: {
      title: "How the cats came to live at the faculty, told by the keepers",
      summary: "A stray's path from the day it's found to becoming a faculty cat or finding a new home, from the keepers' interview notes.",
      body: "Most of the faculty's cats weren't born here. They were strays that the head housekeeper or lecturers found and brought in. Some came from Chula's Centenary Park; for others, someone called the keepers to come and collect them.\n\n## What the keepers do when they find a stray\n- Bring it to the faculty to stay for a while\n- Vaccinate it, give flea drops and deworm it\n- Spay or neuter it once it's old enough\n- Ask students to help find it a home\n\n## The faculty's own cats\nThe lecturers and the dean allow cats to be kept at the faculty, but only as many as there are now. From the interviews, about six cats count as the faculty's own: Katua, Krathong, Shabu, Meebun, Baibun and Nu Dam. There used to be seven, including Krarok, who has since passed away.\n\n## What the keepers know but nobody had written down\n- Keepers recognise each cat by its face; some cats have name tags on their collars.\n- Most cats wander around the faculty. Some are commuters: they have a home but still drop by now and then.\n- Some of the food comes from the lecturers and the dean, and some medicine from the students' veterinary club.\n- Every cat can have lickable cat treats.\n\nThis article was put together from the interview notes in the team's sheet. If anything is wrong or missing, please tell us on the Share page.",
      tags: "strays, vaccines, spaying, rehoming, faculty cats", author: "Knowledge hub team", source: "Keepers' interview notes (the team's Cat_profile sheet)"
    },
    a08: {
      title: "If you haven't seen Nu Dam for days, what should you do?",
      summary: "Nu Dam slips away to be alone when she's stressed. The keepers know where to look, and when to report it quickly.",
      body: "Nu Dam is a female cat, over ten years old, who usually stays by the security post on BRK's 1st floor. The keepers say she very much keeps to herself: when she's stressed she goes off alone, sometimes to the garage, and once she disappeared to the Engineering faculty for 10 to 15 days.\n\n## If you can't find Nu Dam\n- Don't panic. Check the garage first, as that's where she usually goes when stressed.\n- Note the date and place you last saw her, then report it on the Share page so the team knows someone is following up.\n- If you find her somewhere else, don't carry her back. A photo and the location are enough.\n\n## Why report it quickly\nThe sheet notes that Nu Dam has kidney problems. If she seems dull, isn't eating, or has been gone for unusually long, tell a keeper straight away. Don't wait.\n\n## A lesson for new keepers\nEvery cat copes with stress differently. Knowing where a cat usually goes to hide helps you tell her normal habits apart from a sign of trouble.",
      tags: "Nu Dam, missing cat, stress, kidneys, BRK", author: "Knowledge hub team", source: "Keepers' interview notes (the team's Cat_profile sheet)"
    },
    a09: {
      title: "How keepers tell the cats apart",
      summary: "The keepers say “I know them by their faces”, but newcomers can't do that straight away. This order helps you learn faster.",
      body: "Several of the faculty's cats look alike, such as the black-and-white Charcoal, Meetang and Cha Latte. Long-time keepers say they “know them by their faces”, a skill that takes time, so newcomers need an easier place to start.\n\n## An order that helps\n- Start with the coat: orange, black, black-and-white, calico or tabby rules out most cats.\n- Then where you saw it: many cats have a regular spot, like the security post on BRK's 1st floor or Thewalai.\n- Look at the collar: the keepers have made name tags for some cats.\n- As you see them more often, learn their faces, the way the keepers do.\n\n## Let the hub help\nThe “Find this cat” page uses the same order: pick the coat and where you saw it, and it shows the cats it could be. If none match, it may be a new cat the team should hear about.",
      tags: "recognising cats, coat, collar, new keepers", author: "Knowledge hub team", source: "Keepers' interview notes (the team's Cat_profile sheet)"
    }
  }
};
