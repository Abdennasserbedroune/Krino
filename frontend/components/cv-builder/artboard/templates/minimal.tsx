"use client";

import type { CvDraft } from "@/lib/cv-builder/types";
import { formatDateRange } from "@/lib/cv-builder/utils";

export function MinimalTemplate({ draft }: { draft: CvDraft }) {
  const { data: d, design } = draft;
  const fz = design.fontSize;

  const sec = (t: string) => (
    <div style={{ marginTop: 12, marginBottom: 4 }}>
      <h2 style={{
        fontSize: `${fz - 0.5}pt`,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.14em",
        color: design.accentColor,
        margin: 0,
      }}>{t}</h2>
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
      padding: `${design.marginTop}mm ${design.marginSide}mm`,
    }}>
      {/* Minimal centered header */}
      <div style={{ textAlign: "center", marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${design.primaryColor}20` }}>
        <h1 style={{ fontSize: `${fz + 9}pt`, fontWeight: 300, margin: 0, letterSpacing: "0.04em", color: design.primaryColor }}>
          {d.basics.name || "Your Name"}
        </h1>
        {d.basics.headline && (
          <p style={{ margin: "3px 0 0", fontSize: `${fz}pt`, color: design.accentColor, letterSpacing: "0.02em" }}>
            {d.basics.headline}
          </p>
        )}
        <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "0 10px", marginTop: 5, fontSize: `${fz - 1}pt`, color: `${design.primaryColor}80` }}>
          {d.basics.email    && <span>{d.basics.email}</span>}
          {d.basics.phone    && <span>{d.basics.phone}</span>}
          {d.basics.location && <span>{d.basics.location}</span>}
          {d.basics.linkedin && <span>{d.basics.linkedin.replace("https://", "")}</span>}
          {d.basics.github   && <span>{d.basics.github.replace("https://", "")}</span>}
        </div>
      </div>

      {d.summary.content && (
        <div>
          {sec("About")}
          <p style={{ margin: "2px 0 0", color: `${design.primaryColor}cc` }}>{d.summary.content}</p>
        </div>
      )}

      {d.experience.length > 0 && (
        <div>
          {sec("Experience")}
          {d.experience.map((exp) => (
            <div key={exp.id} style={{ marginTop: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 600 }}>{exp.position} — <span style={{ fontWeight: 400, color: design.accentColor }}>{exp.company}</span></span>
                <span style={{ fontSize: `${fz - 1}pt`, color: `${design.primaryColor}60` }}>
                  {formatDateRange(exp.startDate, exp.endDate, exp.current)}
                </span>
              </div>
              {exp.bullets.filter(Boolean).length > 0 && (
                <ul style={{ margin: "2px 0 0", paddingLeft: 12 }}>
                  {exp.bullets.filter(Boolean).map((b, i) => (
                    <li key={i} style={{ color: `${design.primaryColor}cc`, marginBottom: 1 }}>{b}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {d.education.length > 0 && (
        <div>
          {sec("Education")}
          {d.education.map((edu) => (
            <div key={edu.id} style={{ marginTop: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 600 }}>{edu.degree}{edu.field ? ` in ${edu.field}` : ""} — <span style={{ fontWeight: 400, color: design.accentColor }}>{edu.institution}</span></span>
                <span style={{ fontSize: `${fz - 1}pt`, color: `${design.primaryColor}60` }}>
                  {formatDateRange(edu.startDate, edu.endDate, edu.current)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {d.skills.length > 0 && (
        <div>
          {sec("Skills")}
          <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 2 }}>
            {d.skills.map((g) => (
              <div key={g.id} style={{ display: "flex", gap: 6 }}>
                {g.category && <span style={{ fontWeight: 600, minWidth: 70, fontSize: `${fz - 0.5}pt` }}>{g.category}:</span>}
                <span style={{ color: `${design.primaryColor}cc` }}>{g.items.join(", ")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {d.projects.length > 0 && (
        <div>
          {sec("Projects")}
          {d.projects.map((proj) => (
            <div key={proj.id} style={{ marginTop: 4 }}>
              <span style={{ fontWeight: 600 }}>{proj.name}</span>
              {proj.techStack.length > 0 && <span style={{ color: `${design.primaryColor}60`, marginLeft: 6, fontSize: `${fz - 1}pt` }}>{proj.techStack.join(" · ")}</span>}
              {proj.bullets.filter(Boolean).map((b, i) => (
                <li key={i} style={{ listStyle: "disc", marginLeft: 12, color: `${design.primaryColor}cc` }}>{b}</li>
              ))}
            </div>
          ))}
        </div>
      )}

      {(d.certifications.length > 0 || d.languages.length > 0) && (
        <div style={{ display: "flex", gap: 24, marginTop: 12 }}>
          {d.certifications.length > 0 && (
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: `${fz - 0.5}pt`, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: design.accentColor, margin: "0 0 4px" }}>Certifications</h2>
              {d.certifications.map((cert) => (
                <p key={cert.id} style={{ margin: "1px 0", fontSize: `${fz - 0.5}pt` }}>{cert.name} — {cert.issuer}</p>
              ))}
            </div>
          )}
          {d.languages.length > 0 && (
            <div>
              <h2 style={{ fontSize: `${fz - 0.5}pt`, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: design.accentColor, margin: "0 0 4px" }}>Languages</h2>
              {d.languages.map((lang) => (
                <p key={lang.id} style={{ margin: "1px 0", fontSize: `${fz - 0.5}pt` }}>{lang.language} — {lang.level.charAt(0).toUpperCase() + lang.level.slice(1)}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
