"use client";

import type { CvDraft } from "@/lib/cv-builder/types";
import { formatDateRange } from "@/lib/cv-builder/utils";

export function ModernTemplate({ draft }: { draft: CvDraft }) {
  const { data: d, design } = draft;
  const fz = design.fontSize;

  const sec = (t: string) => (
    <div style={{ marginTop: 10, marginBottom: 3 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ width: 3, height: 14, borderRadius: 2, background: design.accentColor, flexShrink: 0 }} />
        <h2 style={{
          fontSize: `${fz + 0.5}pt`,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          margin: 0,
          color: design.primaryColor,
        }}>{t}</h2>
      </div>
      <div style={{ height: 1, background: `${design.accentColor}40`, marginTop: 3 }} />
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
      {/* Bold header band */}
      <div style={{
        background: design.primaryColor,
        padding: `${design.marginTop * 0.6}mm ${design.marginSide}mm`,
        color: "#fff",
      }}>
        <h1 style={{ fontSize: `${fz + 11}pt`, fontWeight: 900, margin: 0, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
          {d.basics.name || "Your Name"}
        </h1>
        {d.basics.headline && (
          <p style={{ margin: "3px 0 0", fontSize: `${fz + 1}pt`, color: design.accentColor, fontWeight: 600 }}>
            {d.basics.headline}
          </p>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0 12px", marginTop: 6, fontSize: `${fz - 1}pt`, opacity: 0.7 }}>
          {d.basics.email    && <span>{d.basics.email}</span>}
          {d.basics.phone    && <span>{d.basics.phone}</span>}
          {d.basics.location && <span>{d.basics.location}</span>}
          {d.basics.linkedin && <span>{d.basics.linkedin.replace("https://", "")}</span>}
          {d.basics.github   && <span>{d.basics.github.replace("https://", "")}</span>}
        </div>
      </div>

      <div style={{ padding: `6px ${design.marginSide}mm ${design.marginTop}mm` }}>
        {d.summary.content && (
          <div>
            {sec("Summary")}
            <p style={{ margin: "3px 0 0" }}>{d.summary.content}</p>
          </div>
        )}

        {d.experience.length > 0 && (
          <div>
            {sec("Experience")}
            {d.experience.map((exp) => (
              <div key={exp.id} style={{ marginTop: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontWeight: 700 }}>{exp.position}</span>
                  <span style={{
                    fontSize: `${fz - 1}pt`,
                    background: `${design.accentColor}18`,
                    color: design.accentColor,
                    padding: "0 5px",
                    borderRadius: 3,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}>{formatDateRange(exp.startDate, exp.endDate, exp.current)}</span>
                </div>
                <div style={{ color: design.accentColor, fontWeight: 600, fontSize: `${fz - 0.5}pt` }}>
                  {exp.company}{exp.location ? ` · ${exp.location}` : ""}
                </div>
                {exp.bullets.filter(Boolean).length > 0 && (
                  <ul style={{ margin: "3px 0 0", paddingLeft: 14 }}>
                    {exp.bullets.filter(Boolean).map((b, i) => (
                      <li key={i} style={{ marginBottom: 2 }}>{b}</li>
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
              <div key={edu.id} style={{ marginTop: 5 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700 }}>{edu.degree}{edu.field ? ` in ${edu.field}` : ""}</span>
                  <span style={{ fontSize: `${fz - 1}pt`, color: `${design.primaryColor}70` }}>
                    {formatDateRange(edu.startDate, edu.endDate, edu.current)}
                  </span>
                </div>
                <div style={{ color: design.accentColor, fontWeight: 500 }}>{edu.institution}{edu.gpa ? ` · GPA ${edu.gpa}` : ""}</div>
              </div>
            ))}
          </div>
        )}

        {d.skills.length > 0 && (
          <div>
            {sec("Skills")}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 6px", marginTop: 4 }}>
              {d.skills.flatMap((g) => g.items).map((skill, i) => (
                <span key={i} style={{
                  background: `${design.primaryColor}0e`,
                  border: `1px solid ${design.primaryColor}22`,
                  borderRadius: 4,
                  padding: "1px 7px",
                  fontSize: `${fz - 1}pt`,
                  fontWeight: 500,
                }}>{skill}</span>
              ))}
            </div>
          </div>
        )}

        {d.projects.length > 0 && (
          <div>
            {sec("Projects")}
            {d.projects.map((proj) => (
              <div key={proj.id} style={{ marginTop: 5 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700 }}>{proj.name}</span>
                  {proj.url && <span style={{ fontSize: `${fz - 1.5}pt`, color: design.accentColor }}>{proj.url}</span>}
                </div>
                {proj.techStack.length > 0 && (
                  <span style={{ fontSize: `${fz - 1}pt`, color: `${design.primaryColor}70` }}>{proj.techStack.join(" · ")}</span>
                )}
                {proj.bullets.filter(Boolean).map((b, i) => (
                  <li key={i} style={{ listStyle: "disc", marginLeft: 14 }}>{b}</li>
                ))}
              </div>
            ))}
          </div>
        )}

        {d.certifications.length > 0 && (
          <div>
            {sec("Certifications")}
            {d.certifications.map((cert) => (
              <div key={cert.id} style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                <span style={{ fontWeight: 600 }}>{cert.name}</span>
                <span style={{ fontSize: `${fz - 1}pt`, color: `${design.primaryColor}70` }}>
                  {cert.issuer}{cert.date ? ` · ${cert.date}` : ""}
                </span>
              </div>
            ))}
          </div>
        )}

        {d.languages.length > 0 && (
          <div>
            {sec("Languages")}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0 14px", marginTop: 3 }}>
              {d.languages.map((lang) => (
                <span key={lang.id}><strong>{lang.language}</strong> — {lang.level.charAt(0).toUpperCase() + lang.level.slice(1)}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
