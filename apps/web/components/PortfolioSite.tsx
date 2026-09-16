"use client";

import type { Portfolio } from "@/lib/types";
import type { CSSProperties } from "react";
import { useState } from "react";
import ChatWidget from "./ChatWidget";

const PROJECTS_PER_PAGE = 6;

const sortVisible = <
  T extends {
    visible?: boolean;
    order?: number;
  },
>(
  items: T[],
) =>
  [...items]
    .filter((item) => item.visible !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

const dateRange = (
  start?: string,
  end?: string,
  current?: boolean,
) =>
  [start, current ? "Present" : end]
    .filter(Boolean)
    .join(" — ");

function Kicker({
  index,
  title,
  meta,
}: {
  index: string;
  title: string;
  meta?: string;
}) {
  return (
    <div className="section-kicker">
      <span>{index}</span>
      <span>// {title}</span>
      <span>{meta || ""}</span>
    </div>
  );
}

export default function PortfolioSite({
  data,
}: {
  data: Portfolio;
}) {
  const [showAllProjects, setShowAllProjects] =
    useState(false);

  const [projectPage, setProjectPage] =
    useState(1);

  const { profile, siteSettings } = data;

  const styles = {
    "--accent": siteSettings.accent,
    "--bg": siteSettings.background,
    "--fg": siteSettings.foreground,
    "--muted": siteSettings.muted,
  } as CSSProperties;

  const education = sortVisible(data.education);
  const experiences = sortVisible(data.experiences);
  const leadership = sortVisible(data.leadership);
  const projects = sortVisible(data.projects);
  const skills = sortVisible(data.skillGroups);

  const languages = sortVisible(
    data.languages || [],
  );

  const certs = sortVisible(
    data.certifications,
  );

  const achievements = sortVisible(
    data.achievements,
  );

  const socials = sortVisible(
    data.socialLinks,
  );

  /*
   * PROJECT PAGINATION
   */

  const totalProjectPages = Math.ceil(
    projects.length / PROJECTS_PER_PAGE,
  );

  const projectStartIndex =
    (projectPage - 1) * PROJECTS_PER_PAGE;

  const paginatedProjects = projects.slice(
    projectStartIndex,
    projectStartIndex + PROJECTS_PER_PAGE,
  );

  const displayedProjects =
    showAllProjects
      ? paginatedProjects
      : projects.slice(0, 3);

  const scrollToProjects = () => {
    window.setTimeout(() => {
      document
        .getElementById("work")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 50);
  };

  const changeProjectPage = (
    page: number,
  ) => {
    if (
      page < 1 ||
      page > totalProjectPages
    ) {
      return;
    }

    setProjectPage(page);
    scrollToProjects();
  };

  const handleViewMore = () => {
    setShowAllProjects(true);
    setProjectPage(1);
  };

  const handleShowLess = () => {
    setShowAllProjects(false);
    setProjectPage(1);
    scrollToProjects();
  };

  return (
    <main style={styles}>
      {/* HEADER */}

      <header className="topbar">
        <a
          className="brand"
          href="#top"
        >
          SBN<span>•</span>
        </a>

        <nav>
          <a href="#work">Work</a>

          <a href="#about">
            About
          </a>

          <a href="/cv">
            CV
          </a>

          <a href="#contact">
            Contact
          </a>
        </nav>

        <a
          className="pill-link"
          href={`mailto:${profile.email}`}
        >
          CONTACT NOW
        </a>
      </header>

      {/* HERO */}

      <section
        id="top"
        className="hero"
      >
        <div className="hero-meta">
          <span>
            {profile.title}
          </span>

          <span>
            {profile.location ||
              "Open to opportunities"}
          </span>

          <span>
            {profile.availability}
          </span>
        </div>

        <h1>
          <span>
            {profile.shortName
              .split(" ")
              .slice(0, 1)
              .join(" ")}
          </span>

          <span>
            {profile.shortName
              .split(" ")
              .slice(1)
              .join(" ")}
          </span>
        </h1>

        <div className="hero-bottom">
          <div>
            <p>
              {profile.heroStatement}
            </p>

            <div className="cvActions">
              <a
                className="viewCV"
                href="/cv"
                target="_blank"
                rel="noopener noreferrer"
              >
                View CV ↗
              </a>

              <a
                className="downloadCV"
                href="/cv/showaib-cv.pdf"
                download="Mohammad-Showaib-Bin-Nasir-CV.pdf"
              >
                Download CV ↓
              </a>
            </div>
          </div>

          <div className="portrait-wrap">
            {profile.portraitUrl ? (
              <img
                src={
                  profile.portraitUrl
                }
                alt={profile.name}
              />
            ) : (
              <div className="portrait-placeholder">
                <span>SBN</span>

                <small>
                  UPLOAD PORTRAIT IN
                  DASHBOARD
                </small>
              </div>
            )}
          </div>
        </div>

        <div className="scroll-note">
          SCROLL TO EXPLORE ↓
        </div>
      </section>

      {/* PROFILE */}

      <section
        id="about"
        className="section split-section"
      >
        <Kicker
          index="01"
          title="Profile"
          meta="Who I Am"
        />

        <div className="section-grid">
          <h2>
            Engineering intelligence
            <br />
            into practical systems.
          </h2>

          <div>
            <p className="lead">
              {profile.bio}
            </p>

            <div className="mini-links">
              {socials.map(
                (social) => (
                  <a
                    key={social.id}
                    href={social.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {social.label} ↗
                  </a>
                ),
              )}
            </div>
          </div>
        </div>
      </section>

      {/* EDUCATION */}

      {education.length > 0 && (
        <section className="section">
          <Kicker
            index="02"
            title="Education"
            meta="Academic Journey"
          />

          <div className="rows">
            {education.map(
              (educationItem) => (
                <article
                  className="row"
                  key={
                    educationItem.id
                  }
                >
                  <div>
                    <small>
                      {dateRange(
                        educationItem.startDate,
                        educationItem.endDate,
                      )}
                    </small>

                    <h3>
                      {
                        educationItem.degree
                      }
                    </h3>
                  </div>

                  <div>
                    <strong>
                      {
                        educationItem.institution
                      }
                    </strong>

                    <p>
                      {
                        educationItem.location
                      }
                    </p>

                    <p>
                      {
                        educationItem.description
                      }
                    </p>
                  </div>

                  <span>
                    {
                      educationItem.status
                    }
                  </span>
                </article>
              ),
            )}
          </div>
        </section>
      )}

      {/* EXPERIENCE */}

      {experiences.length >
        0 && (
          <section className="section">
            <Kicker
              index="03"
              title="Experience"
              meta="Professional"
            />

            <div className="rows">
              {experiences.map(
                (experience) => (
                  <article
                    className="row"
                    key={
                      experience.id
                    }
                  >
                    <div>
                      <small>
                        {dateRange(
                          experience.startDate,
                          experience.endDate,
                          experience.current,
                        )}
                      </small>

                      <h3>
                        {
                          experience.role
                        }
                      </h3>
                    </div>

                    <div>
                      <strong>
                        {
                          experience.organization
                        }
                      </strong>

                      <p>
                        {
                          experience.location
                        }
                      </p>

                      {experience.description.map(
                        (
                          description,
                          index,
                        ) => (
                          <p
                            key={
                              index
                            }
                          >
                            {
                              description
                            }
                          </p>
                        ),
                      )}
                    </div>

                    <span>
                      Experience
                    </span>
                  </article>
                ),
              )}
            </div>
          </section>
        )}

      {/* LEADERSHIP */}

      {leadership.length >
        0 && (
          <section className="section">
            <Kicker
              index="04"
              title="Leadership"
              meta="Community"
            />

            <div className="rows">
              {leadership.map(
                (leadershipItem) => (
                  <article
                    className="row"
                    key={
                      leadershipItem.id
                    }
                  >
                    <div>
                      <small>
                        {dateRange(
                          leadershipItem.startDate,
                          leadershipItem.endDate,
                          leadershipItem.current,
                        )}
                      </small>

                      <h3>
                        {
                          leadershipItem.role
                        }
                      </h3>
                    </div>

                    <div>
                      <strong>
                        {
                          leadershipItem.organization
                        }
                      </strong>

                      {leadershipItem.description.map(
                        (
                          description,
                          index,
                        ) => (
                          <p
                            key={
                              index
                            }
                          >
                            {
                              description
                            }
                          </p>
                        ),
                      )}
                    </div>

                    <span>
                      Leadership
                    </span>
                  </article>
                ),
              )}
            </div>
          </section>
        )}

      {/* PROJECTS */}

      <section
        id="work"
        className="section projects-section"
      >
        <Kicker
          index="05"
          title="Selected Work"
          meta="Projects"
        />

        <div className="section-grid">
          <h2>
            Projects built to
            <br />
            solve, learn & explore.
          </h2>

          <p className="lead">
            A selection of robotics,
            AI and software work.
            Projects can be added,
            reordered, hidden or
            updated from the
            dashboard.
          </p>
        </div>

        {projects.length > 0 ? (
          <>
            <div className="project-grid">
              {displayedProjects.map(
                (
                  project,
                  index,
                ) => {
                  const projectNumber =
                    showAllProjects
                      ? projectStartIndex +
                      index +
                      1
                      : index + 1;

                  return (
                    <article
                      className={`project-card ${project.featured
                        ? "featured"
                        : ""
                        }`}
                      key={
                        project.id
                      }
                    >
                      {project.imageUrl ? (
                        <img
                          src={
                            project.imageUrl
                          }
                          alt={
                            project.title
                          }
                        />
                      ) : (
                        <div className="project-image-placeholder">
                          PROJECT
                          IMAGE
                        </div>
                      )}

                      <div className="project-copy">
                        <small>
                          {String(
                            projectNumber,
                          ).padStart(
                            2,
                            "0",
                          )}{" "}
                          /{" "}
                          {project.category ||
                            "PROJECT"}
                        </small>

                        <h3>
                          {
                            project.title
                          }
                        </h3>

                        <p>
                          {
                            project.summary
                          }
                        </p>

                        <div className="tags">
                          {project.tech.map(
                            (
                              technology,
                            ) => (
                              <span
                                key={
                                  technology
                                }
                              >
                                {
                                  technology
                                }
                              </span>
                            ),
                          )}
                        </div>

                        <div className="project-links">
                          {project.description && (
                            <a
                              href={`/projects/${encodeURIComponent(
                                project.id,
                              )}`}
                            >
                              Case study
                              ↗
                            </a>
                          )}

                          {project.liveUrl && (
                            <a
                              href={
                                project.liveUrl
                              }
                              target="_blank"
                              rel="noreferrer"
                            >
                              Live ↗
                            </a>
                          )}

                          {project.githubUrl && (
                            <a
                              href={
                                project.githubUrl
                              }
                              target="_blank"
                              rel="noreferrer"
                            >
                              Code ↗
                            </a>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                },
              )}
            </div>

            {/* PROJECT CONTROLS */}

            {projects.length >
              3 && (
                <div className="projects-navigation">
                  {!showAllProjects ? (
                    <button
                      type="button"
                      className="view-more-projects"
                      onClick={
                        handleViewMore
                      }
                    >
                      <span>
                        View More
                        Projects
                      </span>

                      <span className="navigation-arrow">
                        ↓
                      </span>
                    </button>
                  ) : (
                    <>
                      {totalProjectPages >
                        1 && (
                          <div className="project-pagination">
                            <button
                              type="button"
                              className="pagination-arrow"
                              aria-label="Previous projects"
                              disabled={
                                projectPage ===
                                1
                              }
                              onClick={() =>
                                changeProjectPage(
                                  projectPage -
                                  1,
                                )
                              }
                            >
                              ←
                            </button>

                            <div className="pagination-pages">
                              {Array.from(
                                {
                                  length:
                                    totalProjectPages,
                                },
                                (
                                  _,
                                  index,
                                ) => {
                                  const page =
                                    index +
                                    1;

                                  return (
                                    <button
                                      type="button"
                                      key={
                                        page
                                      }
                                      aria-label={`Go to project page ${page}`}
                                      aria-current={
                                        projectPage ===
                                          page
                                          ? "page"
                                          : undefined
                                      }
                                      className={
                                        projectPage ===
                                          page
                                          ? "active"
                                          : ""
                                      }
                                      onClick={() =>
                                        changeProjectPage(
                                          page,
                                        )
                                      }
                                    >
                                      {String(
                                        page,
                                      ).padStart(
                                        2,
                                        "0",
                                      )}
                                    </button>
                                  );
                                },
                              )}
                            </div>

                            <button
                              type="button"
                              className="pagination-arrow"
                              aria-label="Next projects"
                              disabled={
                                projectPage ===
                                totalProjectPages
                              }
                              onClick={() =>
                                changeProjectPage(
                                  projectPage +
                                  1,
                                )
                              }
                            >
                              →
                            </button>
                          </div>
                        )}

                      <div className="project-results-meta">
                        <span>
                          Showing{" "}
                          {projectStartIndex +
                            1}
                          –
                          {Math.min(
                            projectStartIndex +
                            PROJECTS_PER_PAGE,
                            projects.length,
                          )}{" "}
                          of{" "}
                          {
                            projects.length
                          }
                        </span>
                      </div>

                      <button
                        type="button"
                        className="show-less-projects"
                        onClick={
                          handleShowLess
                        }
                      >
                        <span>
                          Show Less
                        </span>

                        <span className="navigation-arrow">
                          ↑
                        </span>
                      </button>
                    </>
                  )}
                </div>
              )}
          </>
        ) : (
          <div className="empty-public">
            PROJECTS WILL APPEAR
            HERE WHEN ADDED FROM
            THE DASHBOARD.
          </div>
        )}
      </section>

      {/* SKILLS */}

      {skills.length > 0 && (
        <section className="section">
          <Kicker
            index="06"
            title="Stack & Tools"
            meta="Capabilities"
          />

          <div className="skills-grid">
            {skills.map(
              (skillGroup) => (
                <article
                  key={
                    skillGroup.id
                  }
                >
                  <small>
                    {
                      skillGroup.category
                    }
                  </small>

                  {skillGroup.skills.map(
                    (skill) => (
                      <h3
                        key={skill}
                      >
                        {skill}
                      </h3>
                    ),
                  )}
                </article>
              ),
            )}
          </div>
        </section>
      )}

      {/* LANGUAGES */}

      {languages.length >
        0 && (
          <section className="section languages-section">
            <Kicker
              index="07"
              title="Languages"
              meta="Communication"
            />

            <div className="language-list">
              {languages.map(
                (language) => (
                  <div
                    key={
                      language.id
                    }
                  >
                    <h3>
                      {
                        language.name
                      }
                    </h3>

                    <span>
                      {
                        language.level
                      }
                    </span>
                  </div>
                ),
              )}
            </div>
          </section>
        )}

      {/* CERTIFICATES */}

      {(certs.length > 0 ||
        achievements.length >
        0) && (
          <section className="section">
            <Kicker
              index="08"
              title="Credentials"
              meta="Recognition"
            />

            <div className="credentials-grid">
              <div>
                <h2>
                  Certifications
                </h2>

                {certs.map(
                  (certificate) => (
                    <div
                      className="credential"
                      key={
                        certificate.id
                      }
                    >
                      <strong>
                        {
                          certificate.name
                        }
                      </strong>

                      <span>
                        {
                          certificate.issuer
                        }
                      </span>

                      <small>
                        {
                          certificate.date
                        }
                      </small>
                    </div>
                  ),
                )}
              </div>

              <div>
                <h2>
                  Achievements
                </h2>

                {achievements.map(
                  (achievement) => (
                    <div
                      className="credential"
                      key={
                        achievement.id
                      }
                    >
                      <strong>
                        {
                          achievement.title
                        }
                      </strong>

                      <span>
                        {
                          achievement.organization
                        }
                      </span>

                      <small>
                        {
                          achievement.date
                        }
                      </small>

                      {achievement.description && (
                        <p>
                          {
                            achievement.description
                          }
                        </p>
                      )}
                    </div>
                  ),
                )}
              </div>
            </div>
          </section>
        )}

      {/* AI */}

      <section className="section ai-section">
        <Kicker
          index="09"
          title="Ask AI"
          meta="Portfolio Assistant"
        />

        <div className="section-grid">
          <h2>
            Ask about my
            <br />
            background.
          </h2>

          <div>
            <p className="lead">
              The AI assistant
              answers from the
              portfolio database, so
              visitors can explore
              education, experience,
              leadership, projects and
              skills conversationally.
            </p>

            <button
              type="button"
              className="large-cta"
              onClick={() =>
                (
                  document.querySelector(
                    ".chat-fab",
                  ) as HTMLButtonElement
                )?.click()
              }
            >
              ASK THE ASSISTANT ↗
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}

      <footer
        id="contact"
        className="footer"
      >
        <small>
          LET&apos;S CONNECT
        </small>

        <a
          className="email-big"
          href={`mailto:${profile.email}`}
        >
          {profile.email}
        </a>

        <div className="footer-bottom">
          <span>
            {profile.phone}
          </span>

          <span>
            {
              siteSettings.footerNote
            }
          </span>

          <div>
            {socials.map(
              (social) => (
                <a
                  key={social.id}
                  href={social.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {
                    social.label
                  }
                </a>
              ),
            )}
          </div>
        </div>
      </footer>

      <ChatWidget />
    </main>
  );
}