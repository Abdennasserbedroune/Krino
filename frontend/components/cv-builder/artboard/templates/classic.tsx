"use client";

import type { CvDraft } from "@/lib/cv-builder/types";
import { formatDateRange } from "@/lib/cv-builder/utils";

export function ClassicTemplate({ draft }: { draft: CvDraft }) {
  const { data: d, design } = draft;

  const css: React.CSSProperties = {
    fontFamily: design.fontFamily,
    fontSize: `${design.fontSize}pt`,
    lineHeight: design.lineHeight,
    paddingTop:    `${design.marginTop}mm`,
    paddingBottom: `${design.marginTop}mm`,
    paddingLeft:   `${design.marginSide}mm`,
    paddingRight:  `${design.marginSide}mm`,
    color: design.primaryColor,
    width: "100%",
    height: "100%",
    overflowY: "hidden",
    boxSizing: "border-box",
  };

  const sectionTitle = (title: string) => (
    <div style={{ marginBottom: "4px", marginTop: "10px" }}>
      <h2
        style={{
          fontSize: `${design.fontSize + 1}pt`,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: design.primaryColor,
          margin: 0,
          paddingBottom: "3px",
          borderBottom: `1.5px solid ${design.accentColor}`,
        }}
      >
        {title}
      </h2>
    </div>
  );

  return (
    <div style={css}>
      {/* Header */}
      <div style={{ marginBottom: "8px" }}>
        <h1 style={{ fontSize: `${design.fontSize + 8}pt`, fontWeight: 800, margin: 0, color: design.primaryColor }}>
          {d.basics.name || "Your Name"}
        </h1>
        {d.basics.headline && (
          <p style={{ margin: "2px 0 0", fontSize: `${design.fontSize + 1}pt`, color: design.accentColor, fontWeight: 500 }}>
            {d.basics.headline}
          </p>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0 12px", marginTop: "4px", fontSize: `${design.fontSize - 1}pt`, color: `${design.primaryColor}99` }}>
          {d.basics.email    && <span>{d.basics.email}</span>}
          {d.basics.phone    && <span>{d.basics.phone}</span>}
          {d.basics.location && <span>{d.basics.location}</span>}
          {d.basics.linkedin && <span>{d.basics.linkedin.replace("https://", "")}</span>}
          {d.basics.github   && <span>{d.basics.github.replace("https://", "")}</span>}
        </div>
      </div>

      {/* Summary */}
      {d.summary.content && (
        <div>
          {sectionTitle("Summary")}
          <p style={{ margin: "4px 0 0", fontSize: `${design.fontSize}pt` }}>{d.summary.content}</p>
        </div>
      )}

      {/* Experience */}
      {d.experience.length > 0 && (
        <div>
          {sectionTitle("Experience")}
          {d.experience.map((exp) => (
            <div key={exp.id} style={{ marginTop: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontWeight: 700, fontSize: `${design.fontSize}pt` }}>{exp.position}</span>
                <span style={{ fontSize: `${design.fontSize - 1}pt`, color: `${design.primaryColor}80` }}>
                  {formatDateRange(exp.startDate, exp.endDate, exp.current)}
                </span>
              </div>
              <div style={{ fontSize: `${design.fontSize - 0.5}pt`, color: design.accentColor, fontWeight: 500 }}>
                {exp.company}{exp.location ? ` · ${exp.location}` : ""}
              </div>
              {exp.bullets.filter(Boolean).length > 0 && (
                <ul style={{ margin: "3px 0 0", paddingLeft: "14px" }}>
                  {exp.bullets.filter(Boolean).map((b, i) => (
                    <li key={i} style={{ fontSize: `${design.fontSize - 0.5}pt`, marginBottom: "1px" }}>{b}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Education */}
      {d.education.length > 0 && (
        <div>
          {sectionTitle("Education")}
          {d.education.map((edu) => (
            <div key={edu.id} style={{ marginTop: "5px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 700 }}>{edu.degree}{edu.field ? ` in ${edu.field}` : ""}</span>
                <span style={{ fontSize: `${design.fontSize - 1}pt`, color: `${design.primaryColor}80` }}>
                  {formatDateRange(edu.startDate, edu.endDate, edu.current)}
                </span>
              </div>
              <div style={{ color: design.accentColor, fontWeight: 500, fontSize: `${design.fontSize - 0.5}pt` }}>
                {edu.institution}{edu.gpa ? ` · GPA ${edu.gpa}` : ""}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Skills */}
      {d.skills.length > 0 && (
        <div>
          {sectionTitle("Skills")}
          {d.skills.map((group) => (
            <div key={group.id} style={{ display: "flex", gap: "6px", marginTop: "3px", flexWrap: "wrap", alignItems: "baseline" }}>
              {group.category && (
                <span style={{ fontWeight: 700, fontSize: `${design.fontSize - 0.5}pt`, minWidth: "80px" }}>
                  {group.category}:
                </span>
              )}
              <span style={{ fontSize: `${design.fontSize - 0.5}pt` }}>{group.items.join(" · ")}</span>
            </div>
          ))}
        </div>
      )}

      {/* Projects */}
      {d.projects.length > 0 && (
        <div>
          {sectionTitle("Projects")}
          {d.projects.map((proj) => (
            <div key={proj.id} style={{ marginTop: "5px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 700 }}>{proj.name}</span>
                {(proj.url || proj.repoUrl) && (
                  <span style={{ fontSize: `${design.fontSize - 1.5}pt`, color: design.accentColor }}>
                    {proj.url || proj.repoUrl}
                  </span>
                )}
              </div>
              {proj.techStack.length > 0 && (
                <span style={{ fontSize: `${design.fontSize - 1}pt`, color: `${design.primaryColor}80` }}>
                  {proj.techStack.join(" · ")}
                </span>
              )}
              {proj.bullets.filter(Boolean).map((b, i) => (
                <li key={i} style={{ fontSize: `${design.fontSize - 0.5}pt`, listStyle: "disc", marginLeft: "14px" }}>{b}</li>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Certifications */}
      {d.certifications.length > 0 && (
        <div>
          {sectionTitle("Certifications")}
          {d.certifications.map((cert) => (
            <div key={cert.id} style={{ display: "flex", justifyContent: "space-between", marginTop: "3px" }}>
              <span style={{ fontWeight: 600, fontSize: `${design.fontSize - 0.5}pt` }}>{cert.name}</span>
              <span style={{ fontSize: `${design.fontSize - 1}pt`, color: `${design.primaryColor}80` }}>
                {cert.issuer}{cert.date ? ` · ${cert.date}` : ""}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Languages */}
      {d.languages.length > 0 && (
        <div>
          {sectionTitle("Languages")}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0 16px", marginTop: "3px" }}>
            {d.languages.map((lang) => (
              <span key={lang.id} style={{ fontSize: `${design.fontSize - 0.5}pt` }}>
                <strong>{lang.language}</strong> — {lang.level.charAt(0).toUpperCase() + lang.level.slice(1)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Awards */}
      {d.awards.length > 0 && (
        <div>
          {sectionTitle("Awards")}
          {d.awards.map((award) => (
            <div key={award.id} style={{ display: "flex", justifyContent: "space-between", marginTop: "3px" }}>
              <span style={{ fontWeight: 600 }}>{award.title}</span>
              <span style={{ fontSize: `${design.fontSize - 1}pt`, color: `${design.primaryColor}80` }}>
                {award.issuer}{award.date ? ` · ${award.date}` : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
