import { collection, doc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "../firebase/config";
import { LECTURES } from "../firebase/collections";
import type { TestCategory } from "../types/test";
import type { LectureSection } from "../types/lecture";

interface SeedLecture {
  title: string;
  description: string;
  category: TestCategory;
  language: "en" | "lv";
  status: "draft" | "published";
  coverImage?: string;
  sections: LectureSection[];
  order: number;
  fileType: "manual";
  version: number;
}

const SEED_LECTURES: SeedLecture[] = [
  {
    title: "Introduction to Road Safety Knowledge",
    description: "Learn the fundamentals of road safety rules and regulations.",
    category: "Knowledge",
    language: "en",
    status: "published",
    fileType: "manual",
    version: 1,
    order: 1,
    sections: [
      { id: "k1-s1", title: "Why Road Safety Matters", content: "Road safety is a critical public health issue affecting millions of people worldwide every year. Understanding the basics of road safety can save lives and prevent injuries.\n\nEvery road user — whether a driver, pedestrian, or cyclist — has a responsibility to follow traffic rules and contribute to a safer environment. The knowledge you gain here will form the foundation of safe road behaviour." },
      { id: "k1-s2", title: "Basic Traffic Rules", content: "Traffic rules are designed to create order and predictability on the road. Key rules include obeying speed limits, stopping at red lights, yielding to pedestrians at crosswalks, and maintaining a safe following distance.\n\nThese rules are not arbitrary — each one is based on decades of research into accident causes and prevention strategies. Following them consistently is the single most effective way to reduce your risk on the road." },
      { id: "k1-s3", title: "Rights and Responsibilities", content: "Every road user has both rights and responsibilities. As a driver, you have the right to use public roads, but you also have the responsibility to do so safely and considerately.\n\nUnderstanding this balance is essential. Your actions affect not only your own safety but also the safety of passengers, other drivers, pedestrians, and cyclists sharing the road with you." },
    ],
  },
  {
    title: "Traffic Signs and Markings",
    description: "A comprehensive guide to traffic signs, road markings and their meanings.",
    category: "Knowledge",
    language: "en",
    status: "published",
    fileType: "manual",
    version: 1,
    coverImage: "https://images.unsplash.com/photo-1566847438217-76e82d383f84?w=400&q=80",
    order: 2,
    sections: [
      { id: "k2-s1", title: "Warning Signs", content: "Warning signs alert drivers to potential hazards ahead. They are typically triangular with a red border and white background. Common examples include signs for sharp curves, intersections, pedestrian crossings, and slippery roads.\n\nWhen you see a warning sign, you should reduce your speed and increase your attention to the road ahead. These signs give you time to prepare for changing conditions." },
      { id: "k2-s2", title: "Regulatory Signs", content: "Regulatory signs inform drivers of traffic laws and regulations that must be obeyed. They include speed limit signs, stop signs, no-entry signs, and one-way indicators.\n\nViolating regulatory signs can result in fines, penalty points, or even license suspension. More importantly, these signs exist to protect you and everyone else on the road." },
      { id: "k2-s3", title: "Road Markings", content: "Road markings provide guidance and information directly on the road surface. White solid lines separate traffic flowing in the same direction, while broken lines allow overtaking. Yellow lines typically indicate no-parking zones or bus lanes.\n\nPaying attention to road markings is especially important at intersections, roundabouts, and areas with complex traffic patterns." },
    ],
  },
  {
    title: "Developing Safe Driving Attitudes",
    description: "Understanding the importance of positive attitudes toward road safety.",
    category: "Attitudes",
    language: "en",
    status: "published",
    fileType: "manual",
    version: 1,
    order: 3,
    sections: [
      { id: "a1-s1", title: "The Role of Attitude in Driving", content: "Your attitude behind the wheel significantly influences how safely you drive. Drivers with a positive, responsible attitude are far less likely to be involved in accidents.\n\nResearch shows that aggressive, impatient, or overconfident attitudes are among the leading causes of road accidents. Cultivating patience and respect for other road users is essential." },
      { id: "a1-s2", title: "Empathy and Courtesy", content: "Being empathetic means putting yourself in other road users' shoes. A cyclist may need extra space, a pedestrian may be slow to cross, and a new driver may be nervous. Showing courtesy creates a more pleasant and safer driving environment for everyone.\n\nSimple acts like letting someone merge, waving a thank-you, or not honking aggressively can dramatically improve the driving experience." },
      { id: "a1-s3", title: "Avoiding Road Rage", content: "Road rage is a dangerous emotional response that can lead to reckless driving, confrontations, and accidents. Common triggers include being cut off, tailgated, or stuck in heavy traffic.\n\nTo manage anger on the road: take deep breaths, avoid eye contact with aggressive drivers, don't retaliate, and remember that arriving safely is more important than arriving quickly." },
    ],
  },
  {
    title: "Responsibility on the Road",
    description: "How personal responsibility shapes traffic safety culture.",
    category: "Attitudes",
    language: "en",
    status: "published",
    fileType: "manual",
    version: 1,
    coverImage: "https://images.unsplash.com/photo-1449965408869-ebd3fee2629f?w=400&q=80",
    order: 4,
    sections: [
      { id: "a2-s1", title: "Personal Accountability", content: "Taking personal responsibility for your actions on the road is the cornerstone of safe driving. This means acknowledging when you make a mistake, learning from it, and committing to not repeat it.\n\nMany accidents are caused by drivers who blame others rather than reflecting on their own behaviour. Accountability starts with honest self-assessment." },
      { id: "a2-s2", title: "Protecting Vulnerable Users", content: "Vulnerable road users — including pedestrians, cyclists, children, and elderly people — deserve extra attention and care. Drivers should always be prepared to slow down or stop when these users are present.\n\nRemember that a vehicle is a powerful machine. The consequences of a collision are always more severe for those outside the vehicle." },
      { id: "a2-s3", title: "Leading by Example", content: "Your driving behaviour influences those around you, especially young or new drivers who learn by observation. By consistently following rules and showing courtesy, you set a positive example.\n\nImagine a world where every driver took responsibility and drove with care. Change starts with individual actions — your actions." },
    ],
  },
  {
    title: "Defensive Driving Techniques",
    description: "Practical techniques for safer driving behaviour on the road.",
    category: "Behaviour",
    language: "en",
    status: "published",
    fileType: "manual",
    version: 1,
    order: 5,
    sections: [
      { id: "b1-s1", title: "What Is Defensive Driving?", content: "Defensive driving is a set of strategies that allow you to anticipate dangerous situations and make well-informed decisions. It goes beyond simply following traffic rules — it means being proactive about safety.\n\nThe core principle is to always expect the unexpected. Other drivers may not follow the rules, road conditions may change suddenly, and mechanical failures can happen at any time." },
      { id: "b1-s2", title: "Maintaining Safe Distance", content: "One of the most important defensive driving techniques is maintaining a safe following distance. The \"three-second rule\" is a simple guideline: pick a fixed point on the road, and when the vehicle ahead passes it, count three seconds before you reach the same point.\n\nIn poor weather conditions, at higher speeds, or when following large vehicles, increase this distance to four or five seconds. This extra space gives you more time to react." },
      { id: "b1-s3", title: "Scanning and Awareness", content: "Effective drivers constantly scan their environment. Check your mirrors every 5-8 seconds, look far ahead to anticipate changes, and be aware of your blind spots.\n\nThis 360-degree awareness helps you detect potential hazards early — whether it's a child running toward the road, a vehicle about to change lanes without signalling, or debris on the road surface." },
    ],
  },
  {
    title: "Handling Hazardous Conditions",
    description: "How to adapt your driving behaviour in difficult weather and road conditions.",
    category: "Behaviour",
    language: "en",
    status: "published",
    fileType: "manual",
    version: 1,
    coverImage: "https://images.unsplash.com/photo-1527482797697-8795b05a13fe?w=400&q=80",
    order: 6,
    sections: [
      { id: "b2-s1", title: "Driving in Rain and Fog", content: "Wet roads reduce tire grip significantly, increasing stopping distances by up to 50%. In rain, reduce your speed, increase following distance, and use your headlights. Avoid sudden braking or sharp turns.\n\nIn fog, use low-beam headlights (not high beams, which reflect off the fog). Drive even slower, use road markings as a guide, and listen for traffic you cannot see." },
      { id: "b2-s2", title: "Winter Driving", content: "Ice and snow create extremely dangerous driving conditions. Always use winter tires when temperatures drop below 7\u00B0C. Clear all snow and ice from your vehicle before driving — not just the windshield, but also the roof, lights, and mirrors.\n\nOn icy roads, brake gently and well in advance. If you start to skid, steer gently in the direction you want to go and avoid slamming the brakes." },
      { id: "b2-s3", title: "Night Driving", content: "Driving at night presents unique challenges: reduced visibility, increased fatigue, and higher risk of encountering impaired drivers. Ensure all your lights are working properly and keep your windshield clean.\n\nReduce your speed to match your visibility range. If you can only see 100 meters ahead, drive at a speed that allows you to stop within that distance. Watch for pedestrians and cyclists who may be harder to see at night." },
    ],
  },
  {
    title: "Building Decision-Making Confidence",
    description: "Techniques for making confident and correct decisions while driving.",
    category: "Confidence in One's Judgement",
    language: "en",
    status: "published",
    fileType: "manual",
    version: 1,
    order: 7,
    sections: [
      { id: "c1-s1", title: "The Decision-Making Process", content: "Good driving decisions follow a simple process: Perceive, Evaluate, Act. First, you perceive the situation by scanning your environment. Then, you evaluate the options available to you. Finally, you act by choosing the safest course of action.\n\nWith practice, this process becomes faster and more intuitive. New drivers may need to consciously think through each step, while experienced drivers often make these decisions automatically." },
      { id: "c1-s2", title: "Handling Uncertainty", content: "Not every driving situation has a clear-cut answer. When you're uncertain — for example, whether you have time to merge safely or whether a traffic light will turn red — err on the side of caution.\n\nConfidence in driving doesn't mean taking risks. True confidence comes from knowing when to wait, when to proceed, and when to ask for help (such as pulling over to check a map rather than guessing directions)." },
      { id: "c1-s3", title: "Learning from Experience", content: "Every driving experience is a learning opportunity. After a close call or a stressful situation, reflect on what happened and what you could do differently next time.\n\nKeep in mind that overconfidence is as dangerous as lack of confidence. Even experienced drivers should remain humble and continue learning. Traffic conditions, vehicles, and regulations evolve — and so should your skills." },
    ],
  },
  {
    title: "Self-Assessment for Drivers",
    description: "Learn to accurately assess your own driving abilities and limitations.",
    category: "Confidence in One's Judgement",
    language: "en",
    status: "published",
    fileType: "manual",
    version: 1,
    coverImage: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&q=80",
    order: 8,
    sections: [
      { id: "c2-s1", title: "Knowing Your Limits", content: "Self-assessment begins with honestly recognizing your strengths and weaknesses as a driver. Are you comfortable driving at night? In heavy traffic? On highways? Understanding where you feel less confident helps you prepare.\n\nIt's perfectly normal to avoid situations you're not yet comfortable with. Gradually exposing yourself to these situations — in a controlled way — is how you build genuine confidence." },
      { id: "c2-s2", title: "Recognizing Impairment", content: "Fatigue, stress, illness, and emotional distress all impair your driving ability — sometimes as much as alcohol. Learn to recognize the signs: difficulty concentrating, slower reaction times, frequent yawning, or drifting within your lane.\n\nIf you notice these signs, the responsible decision is to stop driving. Take a break, switch drivers, or use alternative transportation. No destination is worth risking your life." },
      { id: "c2-s3", title: "Continuous Improvement", content: "Even after getting your license, your development as a driver continues. Consider taking advanced driving courses, practicing in varied conditions, and staying updated on new traffic regulations.\n\nSet personal goals for improvement — perhaps parallel parking, highway merging, or driving in a new city. Track your progress and celebrate your growth. Confident driving is a journey, not a destination." },
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
