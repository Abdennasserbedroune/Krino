"use client";

import type { CvDraft } from "@/lib/cv-builder/types";
import { formatDateRange } from "@/lib/cv-builder/utils";

export function CreativeTemplate({ draft }: { draft: CvDraft }) {
  const { data: d, design } = draft;
  const fz = design.fontSize;

  const secHead = (t: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "10px 0 4px" }}>
      <div style={{ width: 4, height: 16, borderRadius: 2, background: design.accentColor, flexShrink: 0 }} />
      <h2 style={{
        fontSize: `${fz + 1}pt`,
        fontWeight: 800,
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        color: design.primaryColor,
        margin: 0,
      }}>{t}</h2>
      <div style={{ flex: 1, height: 1, background: `${design.accentColor}30` }} />
    </div>
  );

  return (
    <div style={{
      fontFamily: design.fontFamily,
      fontSize: `${fz}pt`,
      lineHeight: design.lineHeight,
      color: design.primaryColor,
      width: "100%",
      height: "100%",
      overflowY: "hidden",
      boxSizing: "border-box",
    }}>
      {/* Hero header */}
      <div style={{
        background: `linear-gradient(135deg, ${design.primaryColor} 0%, ${design.accentColor} 100%)`,
        padding: `${design.marginTop}mm ${design.marginSide}mm 14px`,
        color: "#fff",
      }}>
        <h1 style={{ fontSize: `${fz + 12}pt`, fontWeight: 900, margin: 0, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
          {d.basics.name || "Your Name"}
        </h1>
        {d.basics.headline && (
          <p style={{ margin: "4px 0 0", fontSize: `${fz + 1}pt`, fontWeight: 500, opacity: 0.9 }}>
            {d.basics.headline}
          </p>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 12px", marginTop: 8, fontSize: `${fz - 1}pt`, opacity: 0.75 }}>
          {d.basics.email    && <span>{d.basics.email}</span>}
          {d.basics.phone    && <span>{d.basics.phone}</span>}
          {d.basics.location && <span>{d.basics.location}</span>}
          {d.basics.linkedin && <span>{d.basics.linkedin.replace("https://", "")}</span>}
          {d.basics.github   && <span>{d.basics.github.replace("https://", "")}</span>}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: `8px ${design.marginSide}mm ${design.marginTop}mm` }}>
        {d.summary.content && (
          <div>
            {secHead("About Me")}
            <p style={{ margin: "2px 0 0" }}>{d.summary.content}</p>
          </div>
        )}

        {d.experience.length > 0 && (
          <div>
            {secHead("Experience")}
            {d.experience.map((exp) => (
              <div key={exp.id} style={{ marginTop: 6, borderLeft: `2px solid ${design.accentColor}30`, paddingLeft: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700 }}>{exp.position}</span>
                  <span style={{
                    fontSize: `${fz - 1}pt`,
                    background: `${design.accentColor}15`,
                    color: design.accentColor,
                    padding: "0 6px",
                    borderRadius: 4,
                    fontWeight: 600,
                  }}>
                    {formatDateRange(exp.startDate, exp.endDate, exp.current)}
                  </span>
                </div>
                <div style={{ color: design.accentColor, fontWeight: 600, fontSize: `${fz - 0.5}pt` }}>
                  {exp.company}{exp.location ? ` · ${exp.location}` : ""}
                </div>
                {exp.bullets.filter(Boolean).length > 0 && (
                  <ul style={{ margin: "3px 0 0", paddingLeft: 14 }}>
                    {exp.bullets.filter(Boolean).map((b, i) => (
                      <li key={i} style={{ marginBottom: 1 }}>{b}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}

        {d.skills.length > 0 && (
          <div>
            {secHead("Skills")}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 6px", marginTop: 3 }}>
              {d.skills.flatMap((g) => g.items).map((skill, i) => (
                <span key={i} style={{
                  background: `${design.accentColor}18`,
                  color: design.accentColor,
                  border: `1px solid ${design.accentColor}40`,
                  borderRadius: 12,
                  padding: "1px 8px",
                  fontSize: `${fz - 1}pt`,
                  fontWeight: 600,
                }}>{skill}</span>
              ))}
            </div>
          </div>
        )}

        {d.education.length > 0 && (
          <div>
            {secHead("Education")}
            {d.education.map((edu) => (
              <div key={edu.id} style={{ marginTop: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700 }}>{edu.degree}{edu.field ? ` in ${edu.field}` : ""}</span>
                  <span style={{ fontSize: `${fz - 1}pt`, color: `${design.primaryColor}80` }}>
                    {formatDateRange(edu.startDate, edu.endDate, edu.current)}
                  </span>
                </div>
                <div style={{ color: design.accentColor, fontWeight: 500 }}>{edu.institution}</div>
              </div>
            ))}
          </div>
        )}

        {d.projects.length > 0 && (
          <div>
            {secHead("Projects")}
            {d.projects.map((proj) => (
              <div key={proj.id} style={{ marginTop: 5 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700 }}>{proj.name}</span>
                  {proj.url && <span style={{ fontSize: `${fz - 1.5}pt`, color: design.accentColor }}>{proj.url}</span>}
                </div>
                {proj.techStack.length > 0 && (
                  <div style={{ display: "flex", gap: "3px 4px", flexWrap: "wrap", marginTop: 2 }}>
                    {proj.techStack.map((t, i) => (
                      <span key={i} style={{
                        background: `${design.primaryColor}10`,
                        border: `1px solid ${design.primaryColor}20`,
                        borderRadius: 4,
                        padding: "0 5px",
                        fontSize: `${fz - 1.5}pt`,
                      }}>{t}</span>
                    ))}
                  </div>
                )}
                {proj.bullets.filter(Boolean).map((b, i) => (
                  <li key={i} style={{ listStyle: "disc", marginLeft: 14, fontSize: `${fz - 0.5}pt`, marginTop: 2 }}>{b}</li>
                ))}
              </div>
            ))}
          </div>
        )}

        {d.certifications.length > 0 && (
          <div>
            {secHead("Certifications")}
            {d.certifications.map((cert) => (
              <div key={cert.id} style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                <span style={{ fontWeight: 600 }}>{cert.name}</span>
                <span style={{ fontSize: `${fz - 1}pt`, color: `${design.primaryColor}80` }}>
                  {cert.issuer}{cert.date ? ` · ${cert.date}` : ""}
                </span>
              </div>
            ))}
          </div>
        )}

        {d.languages.length > 0 && (
          <div>
            {secHead("Languages")}
            <div style={{ display: "flex", gap: "4px 12px", flexWrap: "wrap", marginTop: 3 }}>
              {d.languages.map((lang) => (
                <span key={lang.id}>
                  <strong>{lang.language}</strong> — {lang.level.charAt(0).toUpperCase() + lang.level.slice(1)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
