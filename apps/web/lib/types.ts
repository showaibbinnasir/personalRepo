export type BaseItem = { id: string; visible?: boolean; order?: number };
export type Experience = BaseItem & { role: string; organization: string; location?: string; startDate?: string; endDate?: string; current?: boolean; description: string[] };
export type Education = BaseItem & { institution: string; degree: string; location?: string; startDate?: string; endDate?: string; status?: string; description?: string };
export type Project = BaseItem & { title: string; category?: string; summary?: string; description?: string; tech: string[]; imageUrl?: string; liveUrl?: string; githubUrl?: string; featured?: boolean };
export type SkillGroup = BaseItem & { category: string; skills: string[] };
export type Certification = BaseItem & { name: string; issuer?: string; date?: string; credentialUrl?: string };
export type Achievement = BaseItem & { title: string; organization?: string; date?: string; description?: string };
export type Leadership = BaseItem & { role: string; organization: string; startDate?: string; endDate?: string; current?: boolean; description: string[] };
export type Language = BaseItem & { name: string; level: string };
export type SocialLink = BaseItem & { label: string; url: string };

export type Portfolio = {
  _id?: string;
  key?: string;
  profile: {
    name: string; shortName: string; title: string; heroStatement: string; bio: string; location: string; email: string; phone: string; availability: string; portraitUrl: string; resumeUrl: string;
  };
  experiences: Experience[];
  education: Education[];
  projects: Project[];
  skillGroups: SkillGroup[];
  certifications: Certification[];
  achievements: Achievement[];
  leadership: Leadership[];
  languages: Language[];
  socialLinks: SocialLink[];
  sectionOrder: string[];
  siteSettings: { accent: string; background: string; foreground: string; muted: string; footerNote: string };
};
