export type BaseItem = { id: string; visible?: boolean; order?: number };
export type Experience = BaseItem & { role: string; organization: string; location?: string; startDate?: string; endDate?: string; current?: boolean; description: string[] };
export type Education = BaseItem & { institution: string; degree: string; location?: string; startDate?: string; endDate?: string; status?: string; description?: string };
export type Project = BaseItem & { title: string; category?: string; summary?: string; description?: string; tech: string[]; imageUrl?: string; liveUrl?: string; githubUrl?: string; license?: string; featured?: boolean };
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
  hiddenSections?: string[];
  updatedAt?: string;
  siteSettings: { accent: string; background: string; foreground: string; muted: string; footerNote: string };
};

export type BlogPostSummary = {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImageUrl: string;
  coverImageAlt: string;
  tags: string[];
  status: "draft" | "published";
  publishedAt: string | null;
  featured: boolean;
  seoTitle: string;
  seoDescription: string;
  readingMinutes: number;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
};

export type BlogPost = BlogPostSummary & { content: string };

export type PostList = { posts: BlogPostSummary[]; total: number; page: number; pages: number; tags: string[] };

export type PostDetail = {
  post: BlogPost;
  prev: Pick<BlogPostSummary, "title" | "slug"> | null;
  next: Pick<BlogPostSummary, "title" | "slug"> | null;
  related: BlogPostSummary[];
};
