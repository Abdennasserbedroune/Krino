"use client";

import type { CvDraft } from "@/lib/cv-builder/types";
import { formatDateRange } from "@/lib/cv-builder/utils";

export function MinimalTemplate({ draft }: { draft: CvDraft }) {
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
    backgroundColor: "#ffffff",
  };

  const sectionTitle = (title: string) => (
    <h2
      style={{
        fontSize: `${design.fontSize - 0.5}pt`,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.15em",
        color: design.accentColor,
        margin: "12px 0 6px",
      }}
    >
      {title}
    </h2>
  );

  return (
    <div style={css}>
      {/* Header — centered, ultra-minimal */}
      <div style={{ textAlign: "center", marginBottom: "12px" }}>
        <h1
          style={{
            fontSize: `${design.fontSize + 9}pt`,
            fontWeight: 300,
            letterSpacing: "0.2em",
            margin: 0,
            color: design.primaryColor,
            textTransform: "uppercase",
          }}
        >
          {d.basics.name || "YOUR NAME"}
        </h1>
        {d.basics.headline && (
          <p
            style={{
              margin: "4px 0 6px",
              fontSize: `${design.fontSize}pt`,
              color: `${design.primaryColor}80`,
              fontWeight: 400,
              letterSpacing: "0.05em",
            }}
          >
            {d.basics.headline}
          </p>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: "0 8px",
            fontSize: `${design.fontSize - 1.5}pt`,
            color: `${design.primaryColor}60`,
          }}
        >
          {[d.basics.email, d.basics.phone, d.basics.location, d.basics.website]
            .filter(Boolean)
            .map((val, i, arr) => (
              <span key={i}>
                {val}
                {i < arr.length - 1 && <span style={{ margin: "0 4px", opacity: 0.3 }}>|</span>}
              </span>
            ))}
        </div>
        <div style={{ height: "1px", backgroundColor: `${design.primaryColor}20`, margin: "8px auto 0", width: "60%" }} />
      </div>

      {/* Summary */}
      {d.summary.content && (
        <div>
          <p style={{ textAlign: "center", fontSize: `${design.fontSize - 0.5}pt`, color: `${design.primaryColor}80`, fontStyle: "italic", margin: 0 }}>
            {d.summary.content}
          </p>
          <div style={{ height: "1px", backgroundColor: `${design.primaryColor}10`, margin: "10px 0" }} />
        </div>
      )}

      {/* Experience */}
      {d.experience.length > 0 && (
        <div>
          {sectionTitle("Experience")}
          {d.experience.map((exp) => (
            <div key={exp.id} style={{ marginBottom: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontWeight: 600 }}>{exp.position}</span>
                <span style={{ fontSize: `${design.fontSize - 1.5}pt`, color: `${design.primaryColor}50` }}>
                  {formatDateRange(exp.startDate, exp.endDate, exp.current)}
                </span>
              </div>
              <span style={{ fontSize: `${design.fontSize - 1}pt`, color: `${design.primaryColor}70` }}>
                {exp.company}{exp.location ? `, ${exp.location}` : ""}
              </span>
              {exp.bullets.filter(Boolean).length > 0 && (
                <ul style={{ margin: "2px 0 0", paddingLeft: "12px" }}>
                  {exp.bullets.filter(Boolean).map((b, i) => (
                    <li key={i} style={{ fontSize: `${design.fontSize - 0.5}pt`, color: `${design.primaryColor}85` }}>{b}</li>
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
            <div key={edu.id} style={{ marginBottom: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 600 }}>{edu.degree}{edu.field ? ` — ${edu.field}` : ""}</span>
                <span style={{ fontSize: `${design.fontSize - 1.5}pt`, color: `${design.primaryColor}50` }}>
                  {formatDateRange(edu.startDate, edu.endDate, edu.current)}
                </span>
              </div>
              <span style={{ fontSize: `${design.fontSize - 1}pt`, color: `${design.primaryColor}70` }}>{edu.institution}</span>
            </div>
          ))}
        </div>
      )}

      {/* Skills */}
      {d.skills.length > 0 && (
        <div>
          {sectionTitle("Skills")}
          {d.skills.map((group) => (
            <div key={group.id} style={{ display: "flex", gap: "4px", flexWrap: "wrap", alignItems: "baseline", marginBottom: "3px" }}>
              {group.category && (
                <span style={{ fontWeight: 600, fontSize: `${design.fontSize - 0.5}pt`, color: design.primaryColor }}>
                  {group.category}:
                </span>
              )}
              <span style={{ fontSize: `${design.fontSize - 1}pt`, color: `${design.primaryColor}80` }}>
                {group.items.join("  ·  ")}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Projects */}
      {d.projects.length > 0 && (
        <div>
          {sectionTitle("Projects")}
          {d.projects.map((proj) => (
            <div key={proj.id} style={{ marginBottom: "6px" }}>
              <span style={{ fontWeight: 600 }}>{proj.name}</span>
              {proj.techStack.length > 0 && (
                <span style={{ fontSize: `${design.fontSize - 1.5}pt`, color: `${design.primaryColor}50`, marginLeft: "6px" }}>
                  {proj.techStack.slice(0, 4).join(" · ")}
                </span>
              )}
              {proj.bullets.filter(Boolean).map((b, i) => (
                <li key={i} style={{ fontSize: `${design.fontSize - 0.5}pt`, color: `${design.primaryColor}80`, listStyle: "none", paddingLeft: "0" }}>— {b}</li>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Languages + Certifications in one row */}
      {(d.languages.length > 0 || d.certifications.length > 0) && (
        <div style={{ display: "flex", gap: "20px" }}>
          {d.languages.length > 0 && (
            <div style={{ flex: 1 }}>
              {sectionTitle("Languages")}
              {d.languages.map((lang) => (
                <span key={lang.id} style={{ fontSize: `${design.fontSize - 0.5}pt`, display: "block", color: `${design.primaryColor}85` }}>
                  {lang.language} <span style={{ color: `${design.primaryColor}50`, fontSize: `${design.fontSize - 1.5}pt` }}>({lang.level})</span>
                </span>
              ))}
            </div>
          )}
          {d.certifications.length > 0 && (
            <div style={{ flex: 1 }}>
              {sectionTitle("Certifications")}
              {d.certifications.map((cert) => (
                <div key={cert.id} style={{ fontSize: `${design.fontSize - 0.5}pt`, marginBottom: "2px" }}>
                  <span style={{ fontWeight: 600 }}>{cert.name}</span>
                  <span style={{ color: `${design.primaryColor}60`, fontSize: `${design.fontSize - 1}pt` }}> · {cert.issuer}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
