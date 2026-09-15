import mongoose from "mongoose";

const itemOptions = { _id: false } as const;
const common = {
  id: { type: String, required: true },
  visible: { type: Boolean, default: true },
  order: { type: Number, default: 0 }
};

const experienceSchema = new mongoose.Schema({
  ...common,
  role: String,
  organization: String,
  location: String,
  startDate: String,
  endDate: String,
  current: Boolean,
  description: [String]
}, itemOptions);

const educationSchema = new mongoose.Schema({
  ...common,
  institution: String,
  degree: String,
  location: String,
  startDate: String,
  endDate: String,
  status: String,
  description: String
}, itemOptions);

const projectSchema = new mongoose.Schema({
  ...common,
  title: String,
  category: String,
  summary: String,
  description: String,
  tech: [String],
  imageUrl: String,
  liveUrl: String,
  githubUrl: String,
  featured: Boolean
}, itemOptions);

const skillGroupSchema = new mongoose.Schema({
  ...common,
  category: String,
  skills: [String]
}, itemOptions);

const certificateSchema = new mongoose.Schema({
  ...common,
  name: String,
  issuer: String,
  date: String,
  credentialUrl: String
}, itemOptions);

const achievementSchema = new mongoose.Schema({
  ...common,
  title: String,
  organization: String,
  date: String,
  description: String
}, itemOptions);

const leadershipSchema = new mongoose.Schema({
  ...common,
  role: String,
  organization: String,
  startDate: String,
  endDate: String,
  current: Boolean,
  description: [String]
}, itemOptions);

const languageSchema = new mongoose.Schema({
  ...common,
  name: String,
  level: String
}, itemOptions);

const socialSchema = new mongoose.Schema({
  ...common,
  label: String,
  url: String
}, itemOptions);

const portfolioSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: "main" },
    profile: {
      name: { type: String, default: "Mohammad Showaib Bin Nasir" },
      shortName: { type: String, default: "Showaib Bin Nasir" },
      title: { type: String, default: "Robotics & Artificial Intelligence Graduate" },
      heroStatement: { type: String, default: "I build intelligent systems where software, robotics and real-world problem solving meet." },
      bio: { type: String, default: "MSc graduate in Robotics and Artificial Intelligence from London Metropolitan University, with a BSc (Hons.) in Computer Science and Engineering. Interested in robotics, AI, software engineering and technology-led problem solving." },
      location: { type: String, default: "" },
      email: { type: String, default: "showaibbin.nasir1@gmail.com" },
      phone: { type: String, default: "+880 1880 614408" },
      availability: { type: String, default: "Open to robotics, AI and software opportunities" },
      portraitUrl: { type: String, default: "" },
      resumeUrl: { type: String, default: "" }
    },
    experiences: { type: [experienceSchema], default: [] },
    education: { type: [educationSchema], default: [] },
    projects: { type: [projectSchema], default: [] },
    skillGroups: { type: [skillGroupSchema], default: [] },
    certifications: { type: [certificateSchema], default: [] },
    achievements: { type: [achievementSchema], default: [] },
    leadership: { type: [leadershipSchema], default: [] },
    languages: { type: [languageSchema], default: [] },
    socialLinks: { type: [socialSchema], default: [] },
    sectionOrder: {
      type: [String],
      default: ["about", "education", "experience", "leadership", "projects", "skills", "certifications", "achievements", "ask-ai", "contact"]
    },
    siteSettings: {
      accent: { type: String, default: "#A71919" },
      background: { type: String, default: "#080606" },
      foreground: { type: String, default: "#F4F1EC" },
      muted: { type: String, default: "#A9A4A0" },
      footerNote: { type: String, default: "Designed around clarity, engineering and intelligent systems." }
    }
  },
  { timestamps: true, minimize: false }
);

export type PortfolioData =
  mongoose.InferSchemaType<typeof portfolioSchema>;

export const Portfolio: mongoose.Model<PortfolioData> =
  (mongoose.models.Portfolio as mongoose.Model<PortfolioData>) ||
  mongoose.model<PortfolioData>("Portfolio", portfolioSchema);
