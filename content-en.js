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
    // 11 Nov sheet: marks, Personal Information, relationships
    "แมวลายสลิดสีครีม ตาสีฟ้า": "Cream tabby with blue eyes",
    "แมวลายสลิดสีน้ำตาล ถุงเท้าขาว": "Brown tabby with white socks",
    "แมวดำ ตาสีเหลือง ถุงเท้าขาว ขนนิ่ม": "Black, yellow eyes, white socks, soft fur",
    "แมวสีเทา": "Grey",
    "แมวสามสีลายสลิด ตาสีเหลือง": "Calico tabby with yellow eyes",
    "แมวลายวัว ตาสีเหลือง ปลายหางงอเหมือนรูปหัวใจ ตัวค่อนข้างใหญ่": "Black and white, yellow eyes, tail tip bent like a heart, fairly big",
    "แมวสามสี ตาสีเหลือง": "Calico with yellow eyes",
    "แมวส้ม": "Orange",
    "แมวลายสลิดสีน้ำตาล คล้ายตาต้า": "Brown tabby, looks like Tata",
    "แมวลายสลิดสีน้ำตาล คล้ายตีตี้": "Brown tabby, looks like Titi",
    "แมวลายวัว ตัวผอม": "Black and white, thin",
    "แมวสีขาวน้ำตาล หน้ากลม": "White and brown, round face",
    "ตามองไม่ค่อยเห็นเนื่องจากอายุมากแล้ว ปัจจุบันอาศัยอยู่ในห้องแม่บ้านข้างตึกบรม": "His eyesight is poor because he's old. He now lives in the housekeepers' room beside the BRK building.",
    "อดีตเคยอยู่สาธิต เป็นแมวหวงถิ่น ชอบนอน พบเห็นได้บริเวณโถง MCS ในบางวัน": "Used to live at the Chula demonstration school. Territorial and sleeps a lot; some days you'll see him in the MCS hall.",
    "มาอยู่อักษรช่วงปี 2024 ไม่ค่อยถูกกับมีตังค์และใบบุญ": "Came to Arts around 2024. Doesn't get on with Meetang or Baibun.",
    "มาอยู่อักษรช่วงปี 2024 สันโดษ ไม่ค่อยถูกกับชาบู": "Came to Arts around 2024. Keeps to herself; doesn't get on with Shabu.",
    "มาอยู่อักษรช่วงปี 2024 ไม่ค่อยถูกกับชาบูและมีบุญ": "Came to Arts around 2024. Doesn't get on with Shabu or Meebun.",
    "มาอยู่อักษรช่วงปี 2024 ชอบไปอยู่แถวเทวาลัย ไม่ค่อยถูกกับมีตังค์": "Came to Arts around 2024. Likes to hang around Thewalai; doesn't get on with Meetang.",
    "ชอบเล่นรองเท้าผ้าใบ ป่วยหนัก": "Loved playing with sneakers. Became very ill.",
    "ไม่ค่อยให้คนจับ เป็นเพื่อนสนิทกับกระทง": "Didn't much like being touched. Krathong's close friend.",
    "ลูกกะตั้ว พี่น้องกับตาต้า": "Katua's kitten; Tata's sibling",
    "ลูกกะตั้ว พี่น้องกับตีตี้": "Katua's kitten; Titi's sibling",
    "เคยมีลูก จับได้แต่ขี้รำคาญ เคยหนีไปวิดวะ หลายวันอยู่ เป็น 10-15 วัน บางทีก็เดินไปโรงรถ เครียด ๆ หนี โลกส่วนตัวสูง": "She's had kittens. You can pick her up, but she gets annoyed. She once ran off to the Engineering faculty for 10–15 days. Sometimes she wanders to the garage. Slips away when stressed. Very much keeps to herself.",
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
      body: "The faculty's cats are loved by many people, so the usual problem isn't a hungry cat but a cat fed several times by different people.\n\n## Before you feed\n- Check that cat's page first. Some have notes about weight or food.\n- Ask the main keeper whether it has already been fed today.\n- Feed only at the spots agreed with the faculty, never in classrooms or the library.\n\n## What not to give\n- Cow's milk. Many adult cats can't digest lactose and get diarrhoea.\n- Human food containing onion, garlic or chocolate.\n- Mackerel, salted fish or any salty human food, especially for a cat with kidney disease like Nu Dam.\n- So many treats that the cat stops eating its main food.\n\n## After feeding\nClear away leftover wet food within about half an hour, and always keep clean water out.",
      tags: "food, weight, milk", author: "Knowledge hub team", source: "Written up from general community-cat care guidance"
    },
    a02: {
      title: "Signs that a cat may be unwell",
      summary: "Symptoms to report to a keeper straight away, and what not to do yourself.",
      body: "Cats tend to hide illness, so the people who see them every day are the ones who can help most. If a cat is different from how it usually is, note it down and report it.\n\n## Report straight away\n- Not eating for more than a day\n- Struggling to breathe, or breathing through the mouth\n- Vomiting or diarrhoea again and again\n- A wound, limping, or not getting up\n- Unusually dull or hiding\n\n## What to do\n- Take a photo and note the time and place.\n- Report it through the form on this site, and contact a keeper or a vet.\n\n## What not to do\nNever give human medicine. Some, such as paracetamol, are seriously toxic to cats. This hub doesn't diagnose illness; if you're unsure, ask a vet.",
      tags: "sick, emergency, medicine", author: "Knowledge hub team", source: "Written up from general community-cat care guidance"
    },
    a03: {
      title: "Why spay and neuter, and how to tell which cats are done",
      summary: "Spaying and neutering keeps the number of cats in the faculty under control and means fewer fights.",
      body: "One female cat can have several litters a year. Without spaying, the number of cats grows faster than the keepers can manage.\n\n## How to tell if a cat has been done\nMany programmes clip the tip of an ear on cats that have been spayed or neutered, but not every cat has it. Check the cat's page in the hub first.\n\n## If you see a cat that hasn't been done\nTell the main keeper through the form. Don't take the cat yourself: going for surgery has to be arranged with the keepers and a vet.",
      tags: "spay, neuter, ear tip, TNR", author: "Knowledge hub team", source: "Written up from general community-cat care guidance"
    },
    a04: {
      title: "Read a cat's body language before reaching out",
      summary: "The tail, ears and eyes tell you whether a cat wants you near.",
      body: "Each cat in the faculty has its own personality. Check the personality on its page, and watch how it's acting right in front of you.\n\n## A cat that's open to you\n- Tail straight up, the tip slightly curled\n- Walks over and rubs against your legs\n- Blinks slowly at you\n\n## A cat that wants to be left alone\n- Ears flat back, hissing, or a puffed-up tail\n- Tail lashing hard\n- Backing away or crouching low\n\n## How to approach\nCrouch down low and hold out a hand for the cat to sniff first. If it doesn't come to you, let it be. Don't pick up a cat you don't know.",
      tags: "body language, handling, scratches", author: "Knowledge hub team", source: "Written up from general community-cat care guidance"
    },
    a05: {
      title: "Wash your hands, clear the bowls, look after the feeding spots",
      summary: "Clean feeding spots are good for the cats, for people, and for the cats' welcome in the faculty.",
      body: "If feeding spots get dirty, attract ants or smell, the faculty may not want cats around. Keeping them clean is everyone's job.\n\n- Wash your hands after touching a cat, especially before eating.\n- Wash food and water bowls every day.\n- Throw bags and scraps into a bin with a lid.\n- Don't feed on stairs or in busy walkways.\n- If you're scratched or bitten, wash the wound with clean water and soap, then see a doctor.",
      tags: "cleanliness, bowls, hand washing", author: "Knowledge hub team", source: "Written up from general community-cat care guidance"
    },
    a07: {
      title: "How the cats came to live at the faculty, told by the keepers",
      summary: "A stray's path from the day it's found to becoming a faculty cat or finding a new home, from the keepers' interview notes.",
      body: "Most of the faculty's cats weren't born here. They were strays that the head housekeeper or lecturers found and brought in. Some came from Chula's Centenary Park; for others, someone called the keepers to come and collect them.\n\n## What the keepers do when they find a stray\n- Bring it to the faculty to stay for a while\n- Vaccinate it, give flea drops and deworm it\n- Spay or neuter it once it's old enough\n- Ask students to help find it a home\n\n## The faculty's own cats\nThe lecturers and the dean allow cats to be kept at the faculty, but only as many as there are now. From the interviews, about six cats count as the faculty's own: Katua, Krathong, Shabu, Meebun, Baibun and Nu Dam. There used to be seven, including Krarok, who has since passed away.\n\n## What the keepers know but nobody had written down\n- Keepers recognise each cat by its face; some cats have name tags on their collars.\n- Most cats wander around the faculty. Some are commuters: they have a home but still drop by now and then.\n- Some of the food comes from the lecturers and the dean, and some medicine from the students' veterinary club.\n- Every cat can have lickable cat treats.\n\nThis article was put together from the interview notes in the team's sheet. If anything is wrong or missing, please tell us on the Share page.",
      tags: "strays, vaccines, spaying, rehoming, faculty cats", author: "Knowledge hub team", source: "Keepers' interview notes"
    },
    a08: {
      title: "If you haven't seen Nu Dam for days, what should you do?",
      summary: "Nu Dam slips away to be alone when she's stressed. The keepers know where to look, and when to report it quickly.",
      body: "Nu Dam is a female cat, over ten years old, who usually stays by the security post on BRK's 1st floor. The keepers say she very much keeps to herself: when she's stressed she goes off alone, sometimes to the garage, and once she disappeared to the Engineering faculty for 10 to 15 days.\n\n## If you can't find Nu Dam\n- Don't panic. Check the garage first, as that's where she usually goes when stressed.\n- Note the date and place you last saw her, then report it on the Tell the team page so the team knows someone is following up.\n- If you find her somewhere else, don't carry her back. A photo and the location are enough.\n\n## Why report it quickly\nThe sheet notes that Nu Dam has kidney problems. If she seems dull, isn't eating, or has been gone for unusually long, tell a keeper straight away. Don't wait.\n\n## A lesson for new keepers\nEvery cat copes with stress differently. Knowing where a cat usually goes to hide helps you tell her normal habits apart from a sign of trouble.",
      tags: "Nu Dam, missing cat, stress, kidneys, BRK", author: "Knowledge hub team", source: "Keepers' interview notes"
    },
    a09: {
      title: "How keepers tell the cats apart",
      summary: "The keepers say “I know them by their faces”, but newcomers can't do that straight away. This order helps you learn faster.",
      body: "Several of the faculty's cats look alike, such as the black-and-white Charcoal, Meetang and Cha Latte. Long-time keepers say they “know them by their faces”, a skill that takes time, so newcomers need an easier place to start.\n\n## An order that helps\n- Start with the coat: orange, black, black-and-white, calico or tabby rules out most cats.\n- Then where you saw it: many cats have a regular spot, like the security post on BRK's 1st floor or Thewalai.\n- Look at the collar: the keepers have made name tags for some cats.\n- As you see them more often, learn their faces, the way the keepers do.\n\n## Let the hub help\nThe “Find this cat” page uses the same order: pick the coat and where you saw it, and it shows the cats it could be. If none match, it may be a new cat the team should hear about.",
      tags: "recognising cats, coat, collar, new keepers", author: "Knowledge hub team", source: "Keepers' interview notes"
    },
    a10: {
      title: "A cat's been bitten: basic wound care",
      summary: "A cat-bite wound looks small but often turns into an abscess within days. What you can do yourself, and when it needs a vet.",
      body: "Some pairs of cats in the faculty don't get on, and they have already bitten each other badly enough to leave wounds. A cat's tooth makes a small hole that closes quickly and traps germs inside, so after 2 to 5 days it can swell into an abscess.\n\n## Before you handle a hurt cat\n- A hurt cat may bite or scratch the person helping. Wear gloves or wrap it in a towel first.\n- If it hisses or runs, don't force it. Take a photo of the wound and fetch a keeper.\n\n## A small, shallow wound that has stopped bleeding\n- Rinse it with wound saline or clean water.\n- Don't use alcohol, hydrogen peroxide or human creams.\n- Take a photo, then check it every day for at least 3 to 5 days for swelling, redness, heat or pus.\n\n## Take it to a vet if\n- It's a deep puncture, or it's still bleeding after about 5 minutes of pressure\n- It's swollen, has pus, or smells\n- The cat is dull, not eating, limping, or the wound is near an eye, the face or a joint\nCat-bite wounds often need antibiotics, and only a vet can prescribe them.\n\n## Afterwards\n- Tell the team on the Tell the team page which cat bit which, when, and where the wound is, so it goes into both cats' records.\n- A cat that is often bitten deeply is at risk of FIV. Ask a vet about a blood test.\n- If a cat bites or scratches you, wash it with soap and running water for a long time, then see a doctor about rabies.\n\nThis hub isn't treatment. If you're unsure, ask a vet.",
      tags: "wounds, cat bites, abscess, first aid", author: "Knowledge hub team", source: "Written up from general cat-care guidance and what keepers told us; not yet reviewed by a vet"
    },
    a11: {
      title: "A cat with kidney disease: what it can eat, and what never to give",
      summary: "Nu Dam has kidney disease. Mackerel, salted fish and salty human food make her kidneys work harder. Read this before you offer her anything.",
      body: "Chronic kidney disease is common in older cats. Kidney tissue that's lost doesn't recover, so care is about slowing it down, and food is where everyone can help most.\n\nIn the faculty, Nu Dam already has kidney disease according to the team's sheet, and someone has given her fish, which she should never have.\n\n## Never give\n- Mackerel, salted fish, tinned fish, or fish cooked for people\n- Any human food, such as sausages, meatballs, chicken rice or crisps. It's far too salty for a cat.\n- Cat treats you're not sure suit a cat with kidney disease. If in doubt, ask a keeper first.\n\n## Do\n- Give only the food the keepers or a vet have set out. Cats with kidney disease usually eat a special renal diet.\n- Keep clean water out at all times. Wet food helps them take in more water too.\n- Never give human medicine. Some painkillers damage a cat's kidneys directly.\n\n## Signs it may be getting worse\n- Drinking and peeing much more than usual\n- Not eating, losing weight, a rough coat\n- Vomiting often, dullness, or bad breath\nIf you see any of these, tell a keeper straight away. A cat with kidney disease should have regular blood tests at a vet.\n\n## Why people still give fish\nMostly out of love, without knowing the cat is ill. The page of any cat with kidney disease on this site now shows a food warning at the top. Please pass it on.",
      tags: "kidneys, food, fish, salt, older cats", author: "Knowledge hub team", source: "Written up from general guidance on feline kidney disease and what keepers told us; not yet reviewed by a vet"
    },
    a12: {
      title: "FIV (feline AIDS): how it spreads, and living alongside other cats",
      summary: "FIV spreads mainly through deep bite wounds and doesn't infect people. A cat with FIV can live for many years with good care.",
      body: "FIV is a virus that slowly weakens a cat's immune system. It isn't the same disease as HIV in people, and people can't catch it.\n\n## How it spreads\n- Mainly through deep bite wounds, so cats that fight are most at risk\n- Sharing bowls or grooming each other very rarely passes it on\n- A mother can pass it to her kittens, but not often\n\n## How to tell\nYou can't tell by looking. Many cats show no signs for years; only a blood test at a vet will tell you. A cat that has been bitten deeply should be tested.\n\n## If a cat has FIV\n- There's no cure yet, but many cats with FIV live almost as long as other cats.\n- A weaker immune system means they fall ill more easily: gum disease, colds, slow-healing wounds. Report anything unusual sooner than you would for other cats.\n- Keep it apart from cats that bite. Cats that get on and don't fight can usually live together; let a vet decide.\n- Feed cooked food, not raw meat.\n\n## Prevention\n- Spay and neuter: neutered cats fight less.\n- Keep pairs that don't get on apart, and don't put their bowls near each other.\n- Treat bite wounds early.",
      tags: "FIV, feline AIDS, infectious disease, cat bites, keeping apart", author: "Knowledge hub team", source: "Written up from general guidance on feline infectious disease; not yet reviewed by a vet"
    },
    a13: {
      title: "FeLV (feline leukaemia): spreads more easily than FIV",
      summary: "FeLV spreads through saliva, grooming each other and shared bowls. A cat with FeLV must be kept apart from the others.",
      body: "Feline leukaemia virus, or FeLV, is another virus that suppresses the immune system. It can cause anaemia and some cancers. It doesn't infect people or dogs, but it passes between cats far more easily than FIV.\n\n## How it spreads\n- Saliva and nasal discharge: grooming each other, sharing food bowls, sharing a litter tray\n- Bite wounds\n- From a mother to her kittens\n\n## How to tell\nA blood test at a vet. Many clinics test for FIV and FeLV together in one go. A newly found cat should be tested before it lives with the others.\n\n## If a cat has FeLV\n- Keep it apart from cats that don't have it: separate bed, food bowl, water bowl and litter tray.\n- Wash bowls and your hands with soap after handling it. The virus doesn't survive long outside the cat.\n- Watch for dullness, pale gums, weight loss or frequent fevers, and tell a keeper.\n\n## Prevention\nThere is a FeLV vaccine for cats that have tested negative. Ask a vet which of the faculty's cats should have it.",
      tags: "FeLV, leukaemia, infectious disease, vaccine, keeping apart", author: "Knowledge hub team", source: "Written up from general guidance on feline infectious disease; not yet reviewed by a vet"
    },
    a14: {
      title: "Which cats must be kept apart, and how",
      summary: "Two cases: cats with an infectious disease, and pairs that don't get on, like Shabu and Meetang, who have bitten each other badly enough to leave wounds.",
      body: "Housekeepers, security guards and every keeper should know this, because they're the ones who see the cats every day.\n\n## 1. Cats with an infectious disease\n- Tested positive for FeLV: always a separate bed, bowls and litter tray from the others\n- Tested positive for FIV: keep it away from cats that bite\n- A cold, sneezing, runny eyes or nose: keep it apart until a vet has seen it\n- A newly found cat: keep it apart for about 2 weeks, and have it checked, vaccinated and dewormed before it joins the others\n\n## 2. Pairs that don't get on\nFrom the team's sheet and what keepers told us\n- Shabu and Meetang don't get on and have bitten each other badly enough to leave wounds. Take extra care.\n- Shabu and Baibun\n- Meetang and Meebun\n- Shabu has bitten Katua\n- Meetang has bitten Charcoal and Chada\nThe latest list is on the Sick cat page, which you can print as a poster.\n\n## How to keep them apart\n- Feed them at different spots or different times. Don't put their bowls near each other.\n- Never shut them in the same cage or room.\n- If a cage is needed, one cage per cat, with water, a bed and a litter tray inside.\n- Each cat has its own bowls, washed every day.\n\n## If you're not sure\nAsk the main keeper before moving or caging any cat. See the Who to ask page.",
      tags: "keeping apart, cages, infectious disease, cat fights, housekeepers, security guards", author: "Knowledge hub team", source: "The team's sheet, what keepers told us (Nov 2026), and general guidance on feline infectious disease"
    },
    a15: {
      title: "Cats eating lizards: watch out for liver flukes",
      summary: "House geckos and tokay geckos carry a liver fluke that infects cats. You can't stop every hunt, but you can lower the risk.",
      body: "The faculty's cats roam outdoors and catch lizards easily. Some lizards carry a liver fluke (Platynosomum), common in hot countries like Thailand. Once a cat eats one, the fluke settles in its bile ducts and liver.\n\n## Signs\n- With only a few flukes, most cats show nothing\n- With many: dullness, poor appetite, weight loss, vomiting or diarrhoea\n- Yellow eyes, gums or skin: take the cat to a vet straight away\n\n## Lowering the risk\n- If you see a cat with a lizard in its mouth, don't try to take it away; you'll get bitten. Note which cat and when, and tell the team.\n- Deworm as a vet advises. Some ordinary dewormers don't cover flukes, so let a vet choose the medicine and the dose.\n- Clear food scraps around feeding spots. Scraps draw insects, and insects draw lizards.",
      tags: "parasites, lizards, geckos, deworming, liver", author: "Knowledge hub team", source: "Written up from general guidance on feline parasites and what keepers told us; not yet reviewed by a vet"
    },
    a16: {
      title: "You see cats fighting: what to do, and who to tell",
      summary: "Don't use your hands. Make a loud noise or put something between them, then tell that cat's main keeper directly.",
      body: "Someone once saw cats fighting and told a newly arrived security guard, but nobody knew who to tell next. In the end Meetang bit Charcoal and Chada badly enough to leave wounds. This page spells out what to do.\n\n## While they're fighting\n- Don't use your hands or feet. A fighting cat will bite people, even one that's normally tame.\n- Clap or make a loud noise.\n- Put something large and flat between them, like a cardboard box, a folder or a board.\n- Throw a cloth over one of them to stop it.\n\n## Once they're apart\n- Don't pick them up yet. They're still frightened and may turn and bite. Let them calm down for a while.\n- Look for wounds, and keep checking for 2 to 5 days: bite wounds often swell into abscesses later.\n- Note which cats, where and what time. Take a photo or a clip if you can.\n\n## Who to tell\n- That cat's main keeper: see the Who to ask page. The faculty's cat keepers can be found in the housekeepers' room beside BRK.\n- The team, on the Tell the team page, so it goes into both cats' records and the next person knows this pair must be kept apart.\n- A deep wound, bleeding that won't stop, or a dull cat: go to the Sick cat page.\n\n## If you're a security guard or housekeeper\nYou see the cats more than anyone. If you see a pair that doesn't get on close together, feed them at separate spots or tell a keeper. The list of pairs to watch is on the Sick cat page; print it as a poster for the guard post or the housekeepers' room.",
      tags: "cat fights, cat bites, who to tell, security guards, housekeepers", author: "Knowledge hub team", source: "What keepers told us (Nov 2026) and general guidance on cat behaviour"
    }
  }
};
