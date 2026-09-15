import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDb } from "../db.js";
import { Admin } from "../models/Admin.js";
import { Portfolio } from "../models/Portfolio.js";
import mongoose from "mongoose";

await connectDb();
const email = process.env.ADMIN_EMAIL?.toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (!email || !password || password.length < 8) throw new Error("Set ADMIN_EMAIL and an ADMIN_PASSWORD of at least 8 characters before seeding");

const passwordHash = await bcrypt.hash(password, 12);
await Admin.findOneAndUpdate({ email }, { email, passwordHash }, { upsert: true, new: true });

const seed = {
  key: "main",
  profile: {
    name: "Mohammad Showaib Bin Nasir",
    shortName: "Showaib Bin Nasir",
    title: "Robotics & Artificial Intelligence Graduate",
    heroStatement: "I build intelligent systems where software, robotics and real-world problem solving meet.",
    bio: "MSc graduate in Robotics and Artificial Intelligence from London Metropolitan University, with a BSc (Hons.) in Computer Science and Engineering. My interests span robotics, artificial intelligence, software engineering and practical technology solutions.",
    location: "",
    email: "showaibbin.nasir1@gmail.com",
    phone: "+880 1880 614408",
    availability: "Open to robotics, AI and software opportunities",
    portraitUrl: "",
    resumeUrl: ""
  },
  experiences: [],
  education: [
    { id: "edu-lmu", institution: "London Metropolitan University", degree: "MSc Robotics and Artificial Intelligence", location: "London, United Kingdom", startDate: "2025", endDate: "2026", status: "Completed", description: "Postgraduate study focused on robotics, artificial intelligence and intelligent systems.", visible: true, order: 0 },
    { id: "edu-bgctub", institution: "BGC Trust University Bangladesh", degree: "BSc (Hons.) in Computer Science and Engineering", location: "Bangladesh", startDate: "2019", endDate: "2023", status: "Completed", description: "Undergraduate study in computer science and engineering.", visible: true, order: 1 }
  ],
  projects: [],
  skillGroups: [],
  leadership: [
    { id: "lead-allied-vp", role: "Vice President", organization: "Allied Computer Streams, BGC Trust University Bangladesh", startDate: "May 2023", endDate: "", current: true, description: ["Led and coordinated student-led academic, technical and extracurricular initiatives, supporting event planning, team management and collaboration across the university community.", "Worked with executive members and faculty coordinators to organise activities, promote student engagement and strengthen communication across the campus community."], visible: true, order: 0 }
  ],
  certifications: [
    { id: "cert-mern", name: "Web Development with MERN Stack", issuer: "Programming Hero", date: "2022 – 2023", credentialUrl: "", visible: true, order: 0 },
    { id: "cert-robotics", name: "Intensive Certified Robotics Course", issuer: "Japan-Bangladesh Robotics and Advanced Research Center", date: "2020", credentialUrl: "", visible: true, order: 1 }
  ],
  achievements: [
    { id: "ach-designer", title: "Best Designer Award", organization: "Summer Tech Fest, BGC Trust University Bangladesh", date: "2022", description: "", visible: true, order: 0 },
    { id: "ach-innovation", title: "Best Innovation Award — 2nd Place", organization: "Winter School, BGC Trust University Bangladesh", date: "2019", description: "Ship Accident Prevention System.", visible: true, order: 1 },
    { id: "ach-programming", title: "Intra-University Programming Contest Participant", organization: "BGC Trust University Bangladesh", date: "2019 & 2022", description: "", visible: true, order: 2 }
  ],
  languages: [
    { id: "lang-bangla", name: "Bangla", level: "Native", visible: true, order: 0 },
    { id: "lang-english", name: "English", level: "Working proficiency", visible: true, order: 1 }
  ],
  socialLinks: [
    { id: "social-linkedin", label: "LinkedIn", url: "https://linkedin.com/in/showaib-bin-nasir-7381491a3", visible: true, order: 0 },
    { id: "social-github", label: "GitHub", url: "https://github.com/showaibbinnasir", visible: true, order: 1 }
  ],
  sectionOrder: ["about", "education", "experience", "leadership", "projects", "skills", "languages", "certifications", "achievements", "ask-ai", "contact"],
  siteSettings: { accent: "#A71919", background: "#080606", foreground: "#F4F1EC", muted: "#A9A4A0", footerNote: "Designed around clarity, engineering and intelligent systems." }
};

await Portfolio.findOneAndUpdate({ key: "main" }, { $setOnInsert: seed }, { upsert: true, new: true, setDefaultsOnInsert: true });
console.log(`Seed complete. Admin: ${email}`);
await mongoose.disconnect();
