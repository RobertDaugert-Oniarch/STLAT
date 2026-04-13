import { collection, doc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "../firebase/config";
import { LECTURES } from "../firebase/collections";
import type { TestCategory } from "../types/test";
import type { LectureSection } from "../types/lecture";

interface SeedLecture {
  title: { en: string; lv: string };
  description: { en: string; lv: string };
  category: TestCategory;
  coverImage?: string;
  sections: LectureSection[];
  order: number;
}

const SEED_LECTURES: SeedLecture[] = [
  {
    title: { en: "Introduction to Road Safety Knowledge", lv: "Ievads ce\u013Cu satiksmes dro\u0161\u012Bb\u0101" },
    description: { en: "Learn the fundamentals of road safety rules and regulations.", lv: "Apg\u016Bstiet ce\u013Cu satiksmes noteikumu pamatus." },
    category: "Knowledge",
    order: 1,
    sections: [
      {
        id: "k1-s1",
        title: { en: "Why Road Safety Matters", lv: "K\u0101p\u0113c ce\u013Cu dro\u0161\u012Bba ir svar\u012Bga" },
        content: {
          en: "Road safety is a critical public health issue affecting millions of people worldwide every year. Understanding the basics of road safety can save lives and prevent injuries.\n\nEvery road user — whether a driver, pedestrian, or cyclist — has a responsibility to follow traffic rules and contribute to a safer environment. The knowledge you gain here will form the foundation of safe road behaviour.",
          lv: "Ce\u013Cu dro\u0161\u012Bba ir kritisks sabiedr\u012Bbas vesel\u012Bbas jaut\u0101jums, kas katru gadu skar miljonus cilv\u0113ku vis\u0101 pasaul\u0113. Ce\u013Cu dro\u0161\u012Bbas pamatu izpratne var gl\u0101bt dz\u012Bv\u012Bbas un nov\u0113rst traumas.\n\nKatram ce\u013Cu lietot\u0101jam — vai tas b\u016Btu autovad\u012Bt\u0101js, g\u0101j\u0113js vai ritebraucjs — ir pien\u0101kums iev\u0113rot satiksmes noteikumus un veicin\u0101t dro\u0161\u0101ku vidi."
        },
      },
      {
        id: "k1-s2",
        title: { en: "Basic Traffic Rules", lv: "Satiksmes pamatnoteikumi" },
        content: {
          en: "Traffic rules are designed to create order and predictability on the road. Key rules include obeying speed limits, stopping at red lights, yielding to pedestrians at crosswalks, and maintaining a safe following distance.\n\nThese rules are not arbitrary — each one is based on decades of research into accident causes and prevention strategies. Following them consistently is the single most effective way to reduce your risk on the road.",
          lv: "Satiksmes noteikumi ir izstr\u0101d\u0101ti, lai rad\u012Btu k\u0101rt\u012Bbu un paredzam\u012Bbu uz ce\u013Ca. Galvenie noteikumi ietver \u0101truma ierobe\u017Eojumu iev\u0113ro\u0161anu, apst\u0101\u0161anos pie sarkan\u0101s gaismas, priek\u0161rokas do\u0161anu g\u0101j\u0113jiem un dro\u0161as distances uztur\u0113\u0161anu.\n\n\u0160ie noteikumi nav patva\u013C\u012Bgi — katrs no tiem balst\u0101s uz gadu desmitiem ilgu p\u0113t\u012Bjumu par nelaimes gad\u012Bjumu c\u0113lo\u0146iem un nov\u0113r\u0161anas strat\u0113\u0123ij\u0101m."
        },
      },
      {
        id: "k1-s3",
        title: { en: "Rights and Responsibilities", lv: "Ties\u012Bbas un pien\u0101kumi" },
        content: {
          en: "Every road user has both rights and responsibilities. As a driver, you have the right to use public roads, but you also have the responsibility to do so safely and considerately.\n\nUnderstanding this balance is essential. Your actions affect not only your own safety but also the safety of passengers, other drivers, pedestrians, and cyclists sharing the road with you.",
          lv: "Katram ce\u013Ca lietot\u0101jam ir gan ties\u012Bbas, gan pien\u0101kumi. K\u0101 autovad\u012Bt\u0101jam jums ir ties\u012Bbas izmantot publiskos ce\u013Cus, bet jums ir ar\u012B pien\u0101kums to dar\u012Bt dro\u0161i un izv\u0113rt\u012Bgi.\n\n\u0160\u012B l\u012Bdz\u0101ra izpratne ir b\u016Btiska. J\u016Bsu darb\u012Bbas ietekm\u0113 ne tikai j\u016Bsu pa\u0161u dro\u0161\u012Bbu, bet ar\u012B pasa\u017Eieru, citu autovad\u012Bt\u0101ju, g\u0101j\u0113ju un ritebraucju dro\u0161\u012Bbu."
        },
      },
    ],
  },
  {
    title: { en: "Traffic Signs and Markings", lv: "Ce\u013Ca z\u012Bmes un mar\u0137\u0113jumi" },
    description: { en: "A comprehensive guide to traffic signs, road markings and their meanings.", lv: "Visaptvero\u0161s ce\u013Ca z\u012Bmju un mar\u0137\u0113jumu ce\u013Cvedis." },
    category: "Knowledge",
    coverImage: "https://images.unsplash.com/photo-1566847438217-76e82d383f84?w=400&q=80",
    order: 2,
    sections: [
      {
        id: "k2-s1",
        title: { en: "Warning Signs", lv: "Br\u012Bdin\u0101juma z\u012Bmes" },
        content: {
          en: "Warning signs alert drivers to potential hazards ahead. They are typically triangular with a red border and white background. Common examples include signs for sharp curves, intersections, pedestrian crossings, and slippery roads.\n\nWhen you see a warning sign, you should reduce your speed and increase your attention to the road ahead. These signs give you time to prepare for changing conditions.",
          lv: "Br\u012Bdin\u0101juma z\u012Bmes br\u012Bdina autovad\u012Bt\u0101jus par iesp\u0113jamiem b\u012Bstamiem priek\u0161\u0101. T\u0101s parasti ir triju\u0161st\u016Bra formas ar sarkanu apmali un baltu fonu. Bieži piem\u0113ri ietver z\u012Bmes asiem pagriezieniem, krustojumiem, g\u0101j\u0113ju p\u0101rej\u0101m un slideniem ce\u013Ciem."
        },
      },
      {
        id: "k2-s2",
        title: { en: "Regulatory Signs", lv: "Aizlieguma un r\u012Bkojuma z\u012Bmes" },
        content: {
          en: "Regulatory signs inform drivers of traffic laws and regulations that must be obeyed. They include speed limit signs, stop signs, no-entry signs, and one-way indicators.\n\nViolating regulatory signs can result in fines, penalty points, or even license suspension. More importantly, these signs exist to protect you and everyone else on the road.",
          lv: "Regul\u0113jo\u0161\u0101s z\u012Bmes inform\u0113 autovad\u012Bt\u0101jus par satiksmes likumiem un noteikumiem, kas j\u0101iev\u0113ro. T\u0101s ietver \u0101truma ierobe\u017Eojuma z\u012Bmes, stop z\u012Bmes, iebraukta aizlieguma z\u012Bmes un vienvirziena indikators."
        },
      },
      {
        id: "k2-s3",
        title: { en: "Road Markings", lv: "Ce\u013Ca mar\u0137\u0113jumi" },
        content: {
          en: "Road markings provide guidance and information directly on the road surface. White solid lines separate traffic flowing in the same direction, while broken lines allow overtaking. Yellow lines typically indicate no-parking zones or bus lanes.\n\nPaying attention to road markings is especially important at intersections, roundabouts, and areas with complex traffic patterns.",
          lv: "Ce\u013Ca mar\u0137\u0113jumi sniedz nor\u0101d\u012Bjumus un inform\u0101ciju tie\u0161i uz ce\u013Ca virsmas. Baltas nep\u0101rtrauktas l\u012Bnijas atdala satiksmi, kas pl\u016Bst vien\u0101 virzien\u0101, bet p\u0101rtrauktas l\u012Bnijas at\u013Cauj apdzit. Dzeltenas l\u012Bnijas parasti nor\u0101da st\u0101v\u0113\u0161anas aizlieguma zonas."
        },
      },
    ],
  },
  {
    title: { en: "Developing Safe Driving Attitudes", lv: "Dro\u0161as brauk\u0161anas attieksmes veido\u0161ana" },
    description: { en: "Understanding the importance of positive attitudes toward road safety.", lv: "Pozit\u012Bvas attieksmes pret ce\u013Cu dro\u0161\u012Bbu noz\u012Bme." },
    category: "Attitudes",
    order: 3,
    sections: [
      {
        id: "a1-s1",
        title: { en: "The Role of Attitude in Driving", lv: "Attieksmes loma brauk\u0161an\u0101" },
        content: {
          en: "Your attitude behind the wheel significantly influences how safely you drive. Drivers with a positive, responsible attitude are far less likely to be involved in accidents.\n\nResearch shows that aggressive, impatient, or overconfident attitudes are among the leading causes of road accidents. Cultivating patience and respect for other road users is essential.",
          lv: "J\u016Bsu attieksme pie st\u016Bres b\u016Btiski ietekm\u0113 to, cik dro\u0161i j\u016Bs brauc\u0101t. Autovad\u012Bt\u0101ji ar pozit\u012Bvu, atbild\u012Bgu attieksmi daudz ret\u0101k non\u0101k nelaimes gad\u012Bjumos.\n\nP\u0113t\u012Bjumi r\u0101da, ka agres\u012Bva, nepaciet\u012Bga vai p\u0101rm\u0113r\u012Bgi pa\u0161p\u0101rliecin\u0101ta attieksme ir viens no galvenajiem ce\u013Cu nelaimes gad\u012Bjumu c\u0113lo\u0146iem."
        },
      },
      {
        id: "a1-s2",
        title: { en: "Empathy and Courtesy", lv: "Emp\u0101tija un pieejas\u012Bba" },
        content: {
          en: "Being empathetic means putting yourself in other road users' shoes. A cyclist may need extra space, a pedestrian may be slow to cross, and a new driver may be nervous. Showing courtesy creates a more pleasant and safer driving environment for everyone.\n\nSimple acts like letting someone merge, waving a thank-you, or not honking aggressively can dramatically improve the driving experience.",
          lv: "B\u016Bt emp\u0101tiskam noz\u012Bm\u0113 iej\u016Bt\u012Bties citu ce\u013Ca lietot\u0101ju situ\u0101cij\u0101. Ritebraucjam var b\u016Bt nepiecie\u0161ama papildu telpa, g\u0101j\u0113js var l\u0113ni \u0161\u0137\u0113rsot ielu, un jauns autovad\u012Bt\u0101js var b\u016Bt nervozs."
        },
      },
      {
        id: "a1-s3",
        title: { en: "Avoiding Road Rage", lv: "Izvairoties no ce\u013Ca agresijas" },
        content: {
          en: "Road rage is a dangerous emotional response that can lead to reckless driving, confrontations, and accidents. Common triggers include being cut off, tailgated, or stuck in heavy traffic.\n\nTo manage anger on the road: take deep breaths, avoid eye contact with aggressive drivers, don't retaliate, and remember that arriving safely is more important than arriving quickly.",
          lv: "Ce\u013Ca agresija ir b\u012Bstama emocion\u0101la reakcija, kas var novest pie bezatbild\u012Bgas brauk\u0161anas, konfliktiem un nelaimes gad\u012Bjumiem.\n\nLai p\u0101rvald\u012Btu dusmas uz ce\u013Ca: elpojiet dzi\u013Ci, izvairieties no acu kontakta ar agres\u012Bviem autovad\u012Bt\u0101jiem un atcerieties, ka dro\u0161i non\u0101kt galam\u0113r\u0137\u012B ir svar\u012Bg\u0101k nek\u0101 \u0101tri."
        },
      },
    ],
  },
  {
    title: { en: "Responsibility on the Road", lv: "Atbild\u012Bba uz ce\u013Ca" },
    description: { en: "How personal responsibility shapes traffic safety culture.", lv: "K\u0101 person\u012Bg\u0101 atbild\u012Bba veido satiksmes dro\u0161\u012Bbas kult\u016Bru." },
    category: "Attitudes",
    coverImage: "https://images.unsplash.com/photo-1449965408869-ebd3fee2629f?w=400&q=80",
    order: 4,
    sections: [
      {
        id: "a2-s1",
        title: { en: "Personal Accountability", lv: "Personisk\u0101 atbild\u012Bba" },
        content: {
          en: "Taking personal responsibility for your actions on the road is the cornerstone of safe driving. This means acknowledging when you make a mistake, learning from it, and committing to not repeat it.\n\nMany accidents are caused by drivers who blame others rather than reflecting on their own behaviour. Accountability starts with honest self-assessment.",
          lv: "Uz\u0146emties personisko atbild\u012Bbu par sav\u0101m darb\u012Bb\u0101m uz ce\u013Ca ir dro\u0161as brauk\u0161anas st\u016Brakmens. Tas noz\u012Bm\u0113 atz\u012Bt, kad pielie\u0137at k\u013C\u016Bdu, m\u0101c\u012Bties no t\u0101s un ap\u0146emties to neatk\u0101rtot."
        },
      },
      {
        id: "a2-s2",
        title: { en: "Protecting Vulnerable Users", lv: "Neaizsarg\u0101to lietot\u0101ju aizsardz\u012Bba" },
        content: {
          en: "Vulnerable road users — including pedestrians, cyclists, children, and elderly people — deserve extra attention and care. Drivers should always be prepared to slow down or stop when these users are present.\n\nRemember that a vehicle is a powerful machine. The consequences of a collision are always more severe for those outside the vehicle.",
          lv: "Neaizsarg\u0101tie ce\u013Ca lietot\u0101ji — tostarp g\u0101j\u0113ji, ritebraucji, b\u0113rni un vec\u0101ka gadag\u0101juma cilv\u0113ki — ir peln\u012Bju\u0161i papildu uzman\u012Bbu un r\u016Bpes."
        },
      },
      {
        id: "a2-s3",
        title: { en: "Leading by Example", lv: "R\u0101d\u012Bt piem\u0113ru" },
        content: {
          en: "Your driving behaviour influences those around you, especially young or new drivers who learn by observation. By consistently following rules and showing courtesy, you set a positive example.\n\nImagine a world where every driver took responsibility and drove with care. Change starts with individual actions — your actions.",
          lv: "J\u016Bsu brauk\u0161anas uzved\u012Bba ietekm\u0113 apk\u0101rt\u0113jos, \u012Bpa\u0161i jaunos autovad\u012Bt\u0101jus, kas m\u0101c\u0101s nov\u0113rojot. Konsekventi iev\u0113rojot noteikumus un izr\u0101dot pieejas\u012Bbu, j\u016Bs r\u0101d\u0101t pozit\u012Bvu piem\u0113ru."
        },
      },
    ],
  },
  {
    title: { en: "Defensive Driving Techniques", lv: "Aizsardz\u012Bbas brauk\u0161anas tehnikas" },
    description: { en: "Practical techniques for safer driving behaviour on the road.", lv: "Praktiskas tehnikas dro\u0161\u0101kai brauk\u0161anas uzved\u012Bbai." },
    category: "Behaviour",
    order: 5,
    sections: [
      {
        id: "b1-s1",
        title: { en: "What Is Defensive Driving?", lv: "Kas ir aizsardz\u012Bbas brauk\u0161ana?" },
        content: {
          en: "Defensive driving is a set of strategies that allow you to anticipate dangerous situations and make well-informed decisions. It goes beyond simply following traffic rules — it means being proactive about safety.\n\nThe core principle is to always expect the unexpected. Other drivers may not follow the rules, road conditions may change suddenly, and mechanical failures can happen at any time.",
          lv: "Aizsardz\u012Bbas brauk\u0161ana ir strat\u0113\u0123iju kopums, kas \u013Cauj paredzet b\u012Bstamas situ\u0101cijas un pie\u0146emt p\u0101rdom\u0101tus l\u0113mumus. T\u0101 p\u0101rsniedz vienkr\u0101\u0161u satiksmes noteikumu iev\u0113ro\u0161anu — t\u0101 noz\u012Bm\u0113 b\u016Bt proakt\u012Bvam attiec\u012Bb\u0101 uz dro\u0161\u012Bbu."
        },
      },
      {
        id: "b1-s2",
        title: { en: "Maintaining Safe Distance", lv: "Dro\u0161as distances uztur\u0113\u0161ana" },
        content: {
          en: "One of the most important defensive driving techniques is maintaining a safe following distance. The \"three-second rule\" is a simple guideline: pick a fixed point on the road, and when the vehicle ahead passes it, count three seconds before you reach the same point.\n\nIn poor weather conditions, at higher speeds, or when following large vehicles, increase this distance to four or five seconds. This extra space gives you more time to react.",
          lv: "Viena no svar\u012Bg\u0101kaj\u0101m aizsardz\u012Bbas brauk\u0161anas tehnik\u0101m ir dro\u0161as distances uztur\u0113\u0161ana. \"Triju sekun\u017Eu likums\" ir vienk\u0101r\u0161s vadl\u012Bnijpunkts: izv\u0113lieties fiks\u0113tu punktu uz ce\u013Ca un skaitiet tr\u012Bs sekundes p\u0113c tam, kad priek\u0161\u0101 eso\u0161ais transportl\u012Bdzeklis to \u0161\u0137\u0113rso."
        },
      },
      {
        id: "b1-s3",
        title: { en: "Scanning and Awareness", lv: "Sken\u0113\u0161ana un izprat\u012Bba" },
        content: {
          en: "Effective drivers constantly scan their environment. Check your mirrors every 5-8 seconds, look far ahead to anticipate changes, and be aware of your blind spots.\n\nThis 360-degree awareness helps you detect potential hazards early — whether it's a child running toward the road, a vehicle about to change lanes without signalling, or debris on the road surface.",
          lv: "Efekt\u012Bvi autovad\u012Bt\u0101ji past\u0101v\u012Bgi sken\u0113 savu vidi. P\u0101rbaudiet spogu\u013Cus ik p\u0113c 5-8 sekund\u0113m, skatieties t\u0101lu uz priek\u0161u un apzinieties savus akl\u0101s zonas."
        },
      },
    ],
  },
  {
    title: { en: "Handling Hazardous Conditions", lv: "B\u012Bstamu apst\u0101k\u013Cu p\u0101rvald\u012Bba" },
    description: { en: "How to adapt your driving behaviour in difficult weather and road conditions.", lv: "K\u0101 piel\u0101got brauk\u0161anu sare\u017E\u0123\u012Btos laika un ce\u013Ca apst\u0101k\u013Cos." },
    category: "Behaviour",
    coverImage: "https://images.unsplash.com/photo-1527482797697-8795b05a13fe?w=400&q=80",
    order: 6,
    sections: [
      {
        id: "b2-s1",
        title: { en: "Driving in Rain and Fog", lv: "Brauk\u0161ana liet\u016B un migla" },
        content: {
          en: "Wet roads reduce tire grip significantly, increasing stopping distances by up to 50%. In rain, reduce your speed, increase following distance, and use your headlights. Avoid sudden braking or sharp turns.\n\nIn fog, use low-beam headlights (not high beams, which reflect off the fog). Drive even slower, use road markings as a guide, and listen for traffic you cannot see.",
          lv: "Slapji ce\u013Ci iev\u0113rojami samazina riepu sa\u0137eri, palielin\u0101t bremz\u0113\u0161anas att\u0101lumu l\u012Bdz 50%. Liet\u016B samaziniet \u0101trumu, palieliniet distanci un izmantojiet lukturis."
        },
      },
      {
        id: "b2-s2",
        title: { en: "Winter Driving", lv: "Ziemas brauk\u0161ana" },
        content: {
          en: "Ice and snow create extremely dangerous driving conditions. Always use winter tires when temperatures drop below 7°C. Clear all snow and ice from your vehicle before driving — not just the windshield, but also the roof, lights, and mirrors.\n\nOn icy roads, brake gently and well in advance. If you start to skid, steer gently in the direction you want to go and avoid slamming the brakes.",
          lv: "Ledus un sniegs rada \u0101rk\u0101rt\u012Bgi b\u012Bstamus brauk\u0161anas apst\u0101k\u013Cus. Vienm\u0113r izmantojiet ziemas riepas, kad temperat\u016Bra nokr\u012Bt zem 7°C. Not\u012Briet visu sniegu un ledu no transportl\u012Bdzek\u013Ca pirms brauk\u0161anas."
        },
      },
      {
        id: "b2-s3",
        title: { en: "Night Driving", lv: "Brauk\u0161ana nakt\u012B" },
        content: {
          en: "Driving at night presents unique challenges: reduced visibility, increased fatigue, and higher risk of encountering impaired drivers. Ensure all your lights are working properly and keep your windshield clean.\n\nReduce your speed to match your visibility range. If you can only see 100 meters ahead, drive at a speed that allows you to stop within that distance. Watch for pedestrians and cyclists who may be harder to see at night.",
          lv: "Brauk\u0161ana nakt\u012B rad\u012Ba unik\u0101lus izaicin\u0101jumus: samazin\u0101ta redzam\u012Bba, palielin\u0101ts nogurums un augst\u0101ks risks satikt alkohola ietekm\u0113 eso\u0161us autovad\u012Bt\u0101jus."
        },
      },
    ],
  },
  {
    title: { en: "Building Decision-Making Confidence", lv: "L\u0113mumu pie\u0146em\u0161anas pa\u0161p\u0101rliec\u012Bbas veido\u0161ana" },
    description: { en: "Techniques for making confident and correct decisions while driving.", lv: "Tehnikas p\u0101rliecino\u0161u un pareizu l\u0113mumu pie\u0146em\u0161anai brauk\u0161anas laik\u0101." },
    category: "Confidence in One's Judgement",
    order: 7,
    sections: [
      {
        id: "c1-s1",
        title: { en: "The Decision-Making Process", lv: "L\u0113mumu pie\u0146em\u0161anas process" },
        content: {
          en: "Good driving decisions follow a simple process: Perceive, Evaluate, Act. First, you perceive the situation by scanning your environment. Then, you evaluate the options available to you. Finally, you act by choosing the safest course of action.\n\nWith practice, this process becomes faster and more intuitive. New drivers may need to consciously think through each step, while experienced drivers often make these decisions automatically.",
          lv: "Labi brauk\u0161anas l\u0113mumi seko vienk\u0101r\u0161am procesam: Uztver, Nov\u0113rt\u0113, R\u012Bkojies. Vispirms j\u016Bs uztverat situ\u0101ciju, sken\u0113jot savu vidi. T\u0101d j\u016Bs nov\u0113rt\u0113jat pieejam\u0101s iesp\u0113jas. Visbeidzot, j\u016Bs r\u012Bkojaties, izv\u0113loties dro\u0161\u0101ko r\u012Bc\u012Bbas kursu."
        },
      },
      {
        id: "c1-s2",
        title: { en: "Handling Uncertainty", lv: "Nenoteikt\u012Bbas p\u0101rvald\u012Bba" },
        content: {
          en: "Not every driving situation has a clear-cut answer. When you're uncertain — for example, whether you have time to merge safely or whether a traffic light will turn red — err on the side of caution.\n\nConfidence in driving doesn't mean taking risks. True confidence comes from knowing when to wait, when to proceed, and when to ask for help (such as pulling over to check a map rather than guessing directions).",
          lv: "Ne katrai brauk\u0161anas situ\u0101cijai ir skaidra atbilde. Kad esat nedr\u0161s — piem\u0113ram, vai jums ir laiks dro\u0161i iek\u013Cauties vai vai luksofors k\u013C\u016Bs sarkans — izv\u0113lieties piesardz\u012Bbu.\n\nPa\u0161p\u0101rliec\u012Bba brauk\u0161an\u0101 nenoz\u012Bm\u0113 riska uz\u0146em\u0161anos. Patiesa pa\u0161p\u0101rliec\u012Bba rodas no zin\u0101\u0161an\u0101m, kad gaid\u012Bt, kad turpin\u0101t un kad l\u016Bgt pal\u012Bdz\u012Bbu."
        },
      },
      {
        id: "c1-s3",
        title: { en: "Learning from Experience", lv: "M\u0101c\u012Bties no pieredzes" },
        content: {
          en: "Every driving experience is a learning opportunity. After a close call or a stressful situation, reflect on what happened and what you could do differently next time.\n\nKeep in mind that overconfidence is as dangerous as lack of confidence. Even experienced drivers should remain humble and continue learning. Traffic conditions, vehicles, and regulations evolve — and so should your skills.",
          lv: "Katra brauk\u0161anas pieredze ir m\u0101c\u012B\u0161an\u0101s iesp\u0113ja. P\u0113c neveiksmn\u012Bgas situ\u0101cijas vai stresainas pieredzes p\u0101rdom\u0101jiet, kas notika un ko n\u0101kamreiz var\u0113tu dar\u012Bt cit\u0101d\u0101k.\n\nAtcerieties, ka p\u0101rm\u0113r\u012Bga pa\u0161p\u0101rliec\u012Bba ir tikpat b\u012Bstama k\u0101 pa\u0161p\u0101rliec\u012Bbas tr\u016Bkums."
        },
      },
    ],
  },
  {
    title: { en: "Self-Assessment for Drivers", lv: "Autovad\u012Bt\u0101ju pa\u0161nov\u0113rt\u0113jums" },
    description: { en: "Learn to accurately assess your own driving abilities and limitations.", lv: "M\u0101cieties prec\u012Bzi nov\u0113rt\u0113t savas brauk\u0161anas sp\u0113jas un ierobe\u017Eojumus." },
    category: "Confidence in One's Judgement",
    coverImage: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&q=80",
    order: 8,
    sections: [
      {
        id: "c2-s1",
        title: { en: "Knowing Your Limits", lv: "Savu robe\u017Eu zin\u0101\u0161ana" },
        content: {
          en: "Self-assessment begins with honestly recognizing your strengths and weaknesses as a driver. Are you comfortable driving at night? In heavy traffic? On highways? Understanding where you feel less confident helps you prepare.\n\nIt's perfectly normal to avoid situations you're not yet comfortable with. Gradually exposing yourself to these situations — in a controlled way — is how you build genuine confidence.",
          lv: "Pa\u0161nov\u0113rt\u0113jums s\u0101kas ar god\u012Bgu savu stipro un v\u0101jo pu\u0161u atz\u012B\u0161anu k\u0101 autovad\u012Bt\u0101jam. Vai jums ir \u0113rti braukt nakt\u012B? Intensv\u0101 satiksm\u0113? Uz autoce\u013Ciem?\n\nIr pilnb\u012Bgi norm\u0101li izvair\u012Bties no situ\u0101cij\u0101m, kur\u0101s v\u0113l ne\u0113rti j\u016Btaties. Pak\u0101peniski pak\u013Caujot sevi \u0161\u012Bm situ\u0101cij\u0101m — kontrol\u0113t\u0101 veid\u0101 — j\u016Bs veido\u0161at patiesi pa\u0161p\u0101rliec\u012Bbu."
        },
      },
      {
        id: "c2-s2",
        title: { en: "Recognizing Impairment", lv: "Trauc\u0113jumu atpaz\u012B\u0161ana" },
        content: {
          en: "Fatigue, stress, illness, and emotional distress all impair your driving ability — sometimes as much as alcohol. Learn to recognize the signs: difficulty concentrating, slower reaction times, frequent yawning, or drifting within your lane.\n\nIf you notice these signs, the responsible decision is to stop driving. Take a break, switch drivers, or use alternative transportation. No destination is worth risking your life.",
          lv: "Nogurums, stress, slim\u012Bba un emocion\u0101ls sa\u0161utums — visi \u0161ie faktori paslktin\u0101 j\u016Bsu brauk\u0161anas sp\u0113jas, da\u017Ereiz tikpat k\u0101 alkohols. Iemcieties atpaz\u012Bt paz\u012Bmes: gr\u016Bt\u012Bbas koncentr\u0113ties, l\u0113n\u0101ks reakcijas laiks, bie\u017Ea \u017E\u0101v\u0101\u0161ana."
        },
      },
      {
        id: "c2-s3",
        title: { en: "Continuous Improvement", lv: "Nep\u0101rtraukta uzlabo\u0161ana" },
        content: {
          en: "Even after getting your license, your development as a driver continues. Consider taking advanced driving courses, practicing in varied conditions, and staying updated on new traffic regulations.\n\nSet personal goals for improvement — perhaps parallel parking, highway merging, or driving in a new city. Track your progress and celebrate your growth. Confident driving is a journey, not a destination.",
          lv: "Pat p\u0113c autovad\u012Bt\u0101ja apliec\u012Bbas ieg\u016B\u0161anas j\u016Bsu att\u012Bst\u012Bba k\u0101 autovad\u012Bt\u0101jam turpin\u0101s. Apsveriet iesp\u0113ju apg\u016Bt papildu brauk\u0161anas kursus, praktiz\u0113ties da\u017E\u0101dos apst\u0101k\u013Cos un sekot l\u012Bdzi jauniem satiksmes noteikumiem.\n\nUzstdiet person\u012Bgus uzlabo\u0161anas m\u0113r\u0137us un izsekojiet savam progresam. Pa\u0161p\u0101rliecin\u0101ta brauk\u0161ana ir ce\u013Cojums, nevis galam\u0113r\u0137is."
        },
      },
    ],
  },
];

/**
 * Seed the lectures collection with sample data.
 * Call from browser console:
 *   import { seedLectures } from './utils/seedLectures'; seedLectures();
 */
export async function seedLectures(): Promise<void> {
  const colRef = collection(db, LECTURES);

  for (const lec of SEED_LECTURES) {
    const docRef = doc(colRef);
    await setDoc(docRef, {
      ...lec,
      createdAt: Timestamp.now(),
    });
  }

  console.log(`Seeded ${SEED_LECTURES.length} lectures.`);
}
