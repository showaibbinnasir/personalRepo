import { getPortfolio } from "@/lib/api";
import type { CSSProperties } from "react";
import styles from "./cv.module.css";

const sortVisible = <T extends { visible?: boolean; order?: number }>(
  items: T[] = []
) =>
  [...items]
    .filter((item) => item.visible !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

const dateRange = (
  start?: string,
  end?: string,
  current?: boolean
) => {
  return [start, current ? "Present" : end].filter(Boolean).join(" — ");
};

export default async function CVPage() {
  const data = await getPortfolio();

  if (!data) {
    return (
      <main className={styles.error}>
        <p>CV data is currently unavailable.</p>
        <a href="/">← Back to portfolio</a>
      </main>
    );
  }

  const {
    profile,
    siteSettings,
    experiences,
    education,
    skillGroups,
    certifications,
    achievements,
    leadership,
    languages,
    socialLinks,
  } = data;

  const pageStyle = {
    "--cv-bg": siteSettings.background,
    "--cv-fg": siteSettings.foreground,
    "--cv-accent": siteSettings.accent,
    "--cv-muted": siteSettings.muted,
  } as CSSProperties;

  const resumeUrl =
    profile.resumeUrl?.trim() ||
    "/cv/Mohammad_Showaib_bin_Nasir_CV.pdf";

  const experienceItems = sortVisible(experiences);
  const educationItems = sortVisible(education);
  const skillItems = sortVisible(skillGroups);
  const certificationItems = sortVisible(certifications);
  const achievementItems = sortVisible(achievements);
  const leadershipItems = sortVisible(leadership);
  const languageItems = sortVisible(languages);
  const socialItems = sortVisible(socialLinks);

  return (
    <main className={styles.page} style={pageStyle}>
      <nav className={styles.nav}>
        <a href="/" className={styles.brand}>
          SBN<span>•</span>
        </a>

        <div className={styles.navActions}>
          <a href="/">← Portfolio</a>

          <a
            href={resumeUrl}
            download="Mohammad-Showaib-Bin-Nasir-CV.pdf"
            className={styles.download}
          >
            Download PDF ↓
          </a>
        </div>
      </nav>

      <header className={styles.hero}>
        <div className={styles.heroMeta}>
          <span>CURRICULUM VITAE</span>
          <span>{profile.location || "London, United Kingdom"}</span>
        </div>

        <h1>
          {profile.name}
        </h1>

        <div className={styles.introGrid}>
          <h2>{profile.title}</h2>

          <div>
            <p className={styles.summary}>
              {profile.bio}
            </p>

            <div className={styles.contact}>
              <a href={`mailto:${profile.email}`}>
                {profile.email}
              </a>

              {profile.phone && (
                <a href={`tel:${profile.phone}`}>
                  {profile.phone}
                </a>
              )}

              {socialItems.map((social) => (
                <a
                  key={social.id}
                  href={social.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {social.label} ↗
                </a>
              ))}
            </div>
          </div>
        </div>
      </header>

      {experienceItems.length > 0 && (
        <section className={styles.section}>
          <SectionHeader
            number="01"
            title="Experience"
            meta="Professional"
          />

          <div className={styles.rows}>
            {experienceItems.map((item) => (
              <article className={styles.row} key={item.id}>
                <div>
                  <small>
                    {dateRange(
                      item.startDate,
                      item.endDate,
                      item.current
                    )}
                  </small>

                  <h3>{item.role}</h3>
                </div>

                <div>
                  <strong>{item.organization}</strong>

                  {item.location && <p>{item.location}</p>}

                  {item.description?.map((line, index) => (
                    <p key={index}>{line}</p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {educationItems.length > 0 && (
        <section className={styles.section}>
          <SectionHeader
            number="02"
            title="Education"
            meta="Academic Journey"
          />

          <div className={styles.rows}>
            {educationItems.map((item) => (
              <article className={styles.row} key={item.id}>
                <div>
                  <small>
                    {dateRange(item.startDate, item.endDate)}
                  </small>

                  <h3>{item.degree}</h3>
                </div>

                <div>
                  <strong>{item.institution}</strong>

                  {item.location && <p>{item.location}</p>}

                  {item.status && (
                    <span className={styles.status}>
                      {item.status}
                    </span>
                  )}

                  {item.description && <p>{item.description}</p>}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {skillItems.length > 0 && (
        <section className={styles.section}>
          <SectionHeader
            number="03"
            title="Skills"
            meta="Capabilities"
          />

          <div className={styles.skills}>
            {skillItems.map((group) => (
              <article key={group.id}>
                <small>{group.category}</small>

                <div>
                  {group.skills.map((skill) => (
                    <span key={skill}>{skill}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {leadershipItems.length > 0 && (
        <section className={styles.section}>
          <SectionHeader
            number="04"
            title="Leadership"
            meta="Community"
          />

          <div className={styles.rows}>
            {leadershipItems.map((item) => (
              <article className={styles.row} key={item.id}>
                <div>
                  <small>
                    {dateRange(
                      item.startDate,
                      item.endDate,
                      item.current
                    )}
                  </small>

                  <h3>{item.role}</h3>
                </div>

                <div>
                  <strong>{item.organization}</strong>

                  {item.description?.map((line, index) => (
                    <p key={index}>{line}</p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {(certificationItems.length > 0 ||
        achievementItems.length > 0) && (
        <section className={styles.section}>
          <SectionHeader
            number="05"
            title="Credentials"
            meta="Recognition"
          />

          <div className={styles.twoColumn}>
            {certificationItems.length > 0 && (
              <div>
                <h2>Certifications</h2>

                {certificationItems.map((item) => (
                  <article
                    className={styles.credential}
                    key={item.id}
                  >
                    <strong>{item.name}</strong>
                    <span>{item.issuer}</span>
                    <small>{item.date}</small>
                  </article>
                ))}
              </div>
            )}

            {achievementItems.length > 0 && (
              <div>
                <h2>Achievements</h2>

                {achievementItems.map((item) => (
                  <article
                    className={styles.credential}
                    key={item.id}
                  >
                    <strong>{item.title}</strong>
                    <span>{item.organization}</span>
                    <small>{item.date}</small>

                    {item.description && (
                      <p>{item.description}</p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {languageItems.length > 0 && (
        <section className={styles.section}>
          <SectionHeader
            number="06"
            title="Languages"
            meta="Communication"
          />

          <div className={styles.languages}>
            {languageItems.map((item) => (
              <article key={item.id}>
                <h3>{item.name}</h3>
                <span>{item.level}</span>
              </article>
            ))}
          </div>
        </section>
      )}

      <footer className={styles.footer}>
        <div>
          <small>CURRICULUM VITAE</small>
          <h2>{profile.name}</h2>
        </div>

        <a
          href={resumeUrl}
          download="Mohammad-Showaib-Bin-Nasir-CV.pdf"
          className={styles.footerDownload}
        >
          DOWNLOAD PDF ↓
        </a>
      </footer>
    </main>
  );
}

function SectionHeader({
  number,
  title,
  meta,
}: {
  number: string;
  title: string;
  meta: string;
}) {
  return (
    <div className={styles.sectionHeader}>
      <span>{number}</span>
      <span>// {title}</span>
      <span>{meta}</span>
    </div>
  );
}