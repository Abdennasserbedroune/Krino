"use client";

import type { CvDraft } from "@/lib/cv-builder/types";
import { formatDateRange } from "@/lib/cv-builder/utils";

export function ExecutiveTemplate({ draft }: { draft: CvDraft }) {
  const { data: d, design } = draft;

  const css: React.CSSProperties = {
    fontFamily: design.fontFamily,
    fontSize: `${design.fontSize}pt`,
    lineHeight: design.lineHeight,
    color: design.primaryColor,
    width: "100%",
    height: "100%",
    overflowY: "hidden",
    boxSizing: "border-box",
    padding: `${design.marginTop}mm ${design.marginSide}mm`,
  };

  const rule = (
    <div style={{ height: "2px", background: design.accentColor, margin: "2px 0 6px", borderRadius: 1 }} />
  );

  const secHead = (t: string) => (
    <div style={{ marginTop: 10 }}>
      <h2 style={{
        fontSize: `${design.fontSize}pt`,
        fontWeight: 800,
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        color: design.accentColor,
        margin: "0 0 2px",
      }}>{t}</h2>
      {rule}
    </div>
  );

  return (
    <div style={css}>
      {/* Header */}
      <div style={{ borderBottom: `3px double ${design.accentColor}`, paddingBottom: 8, marginBottom: 6 }}>
        <h1 style={{ fontSize: `${design.fontSize + 10}pt`, fontWeight: 900, margin: 0, letterSpacing: "-0.01em", color: design.primaryColor }}>
          {d.basics.name || "Your Name"}
        </h1>
        {d.basics.headline && (
          <p style={{ margin: "3px 0 0", fontSize: `${design.fontSize + 1.5}pt`, color: design.accentColor, fontWeight: 600, letterSpacing: "0.02em" }}>
            {d.basics.headline}
          </p>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0 14px", marginTop: 6, fontSize: `${design.fontSize - 1}pt`, color: `${design.primaryColor}99` }}>
          {d.basics.email    && <span>{d.basics.email}</span>}
          {d.basics.phone    && <span>{d.basics.phone}</span>}
          {d.basics.location && <span>{d.basics.location}</span>}
          {d.basics.linkedin && <span>{d.basics.linkedin.replace("https://", "")}</span>}
          {d.basics.github   && <span>{d.basics.github.replace("https://", "")}</span>}
        </div>
      </div>

      {d.summary.content && (
        <div>
          {secHead("Executive Summary")}
          <p style={{ margin: "2px 0 0", fontStyle: "italic" }}>{d.summary.content}</p>
        </div>
      )}

      {d.experience.length > 0 && (
        <div>
          {secHead("Professional Experience")}
          {d.experience.map((exp) => (
            <div key={exp.id} style={{ marginTop: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 800 }}>{exp.position}</span>
                <span style={{ fontSize: `${design.fontSize - 1}pt`, color: `${design.primaryColor}80` }}>
                  {formatDateRange(exp.startDate, exp.endDate, exp.current)}
                </span>
              </div>
              <div style={{ color: design.accentColor, fontWeight: 600, fontSize: `${design.fontSize - 0.5}pt` }}>
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

      {d.education.length > 0 && (
        <div>
          {secHead("Education")}
          {d.education.map((edu) => (
            <div key={edu.id} style={{ marginTop: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 700 }}>{edu.degree}{edu.field ? ` in ${edu.field}` : ""}</span>
                <span style={{ fontSize: `${design.fontSize - 1}pt`, color: `${design.primaryColor}80` }}>
                  {formatDateRange(edu.startDate, edu.endDate, edu.current)}
                </span>
              </div>
              <div style={{ color: design.accentColor, fontWeight: 500 }}>{edu.institution}</div>
            </div>
          ))}
        </div>
      )}

      {d.skills.length > 0 && (
        <div>
          {secHead("Core Competencies")}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 8px", marginTop: 3 }}>
            {d.skills.flatMap((g) => g.items).map((skill, i) => (
              <span key={i} style={{
                border: `1px solid ${design.accentColor}60`,
                borderRadius: 3,
                padding: "1px 6px",
                fontSize: `${design.fontSize - 1}pt`,
                color: design.primaryColor,
              }}>{skill}</span>
            ))}
          </div>
        </div>
      )}

      {d.certifications.length > 0 && (
        <div>
          {secHead("Certifications")}
          {d.certifications.map((cert) => (
            <div key={cert.id} style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
              <span style={{ fontWeight: 600, fontSize: `${design.fontSize - 0.5}pt` }}>{cert.name}</span>
              <span style={{ fontSize: `${design.fontSize - 1}pt`, color: `${design.primaryColor}80` }}>
                {cert.issuer}{cert.date ? ` · ${cert.date}` : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
