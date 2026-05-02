"use client";

import type { CvDraft } from "@/lib/cv-builder/types";
import { formatDateRange } from "@/lib/cv-builder/utils";

export function ModernTemplate({ draft }: { draft: CvDraft }) {
  const { data: d, design } = draft;
  const side = design.marginSide;
  const top  = design.marginTop;

  const sectionTitle = (title: string) => (
    <h2
      style={{
        fontSize: `${design.fontSize}pt`,
        fontWeight: 800,
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        color: "#ffffff",
        margin: "0 0 6px",
        opacity: 0.9,
      }}
    >
      {title}
    </h2>
  );

  const mainSectionTitle = (title: string) => (
    <h2
      style={{
        fontSize: `${design.fontSize}pt`,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: design.accentColor,
        margin: "0 0 4px",
        paddingBottom: "2px",
        borderBottom: `1px solid ${design.accentColor}40`,
      }}
    >
      {title}
    </h2>
  );

  return (
    <div
      style={{
        fontFamily: design.fontFamily,
        fontSize: `${design.fontSize}pt`,
        lineHeight: design.lineHeight,
        display: "flex",
        width: "100%",
        height: "100%",
        color: design.primaryColor,
      }}
    >
      {/* Left column */}
      <div
        style={{
          width: "33%",
          backgroundColor: design.primaryColor,
          padding: `${top}mm ${side * 0.75}mm`,
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          overflowY: "hidden",
          boxSizing: "border-box",
        }}
      >
        {/* Name block */}
        <div>
          <h1 style={{ fontSize: `${design.fontSize + 6}pt`, fontWeight: 800, color: "#fff", margin: 0, lineHeight: 1.2 }}>
            {d.basics.name || "Your Name"}
          </h1>
          {d.basics.headline && (
            <p style={{ margin: "4px 0 0", color: design.accentColor, fontWeight: 600, fontSize: `${design.fontSize - 0.5}pt` }}>
              {d.basics.headline}
            </p>
          )}
        </div>

        {/* Contact */}
        <div style={{ color: "rgba(255,255,255,0.75)", fontSize: `${design.fontSize - 1}pt` }}>
          {sectionTitle("Contact")}
          {d.basics.email    && <p style={{ margin: "1px 0" }}>{d.basics.email}</p>}
          {d.basics.phone    && <p style={{ margin: "1px 0" }}>{d.basics.phone}</p>}
          {d.basics.location && <p style={{ margin: "1px 0" }}>{d.basics.location}</p>}
          {d.basics.linkedin && <p style={{ margin: "1px 0", wordBreak: "break-all" }}>{d.basics.linkedin.replace("https://", "")}</p>}
          {d.basics.github   && <p style={{ margin: "1px 0", wordBreak: "break-all" }}>{d.basics.github.replace("https://", "")}</p>}
        </div>

        {/* Skills in left column */}
        {d.skills.length > 0 && (
          <div>
            {sectionTitle("Skills")}
            {d.skills.map((group) => (
              <div key={group.id} style={{ marginBottom: "6px" }}>
                {group.category && (
                  <p style={{ color: design.accentColor, fontWeight: 600, fontSize: `${design.fontSize - 1}pt`, margin: "0 0 2px" }}>
                    {group.category}
                  </p>
                )}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "3px" }}>
                  {group.items.map((item, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: `${design.fontSize - 1.5}pt`,
                        backgroundColor: "rgba(255,255,255,0.1)",
                        color: "rgba(255,255,255,0.85)",
                        borderRadius: "3px",
                        padding: "1px 5px",
                      }}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Languages */}
        {d.languages.length > 0 && (
          <div>
            {sectionTitle("Languages")}
            {d.languages.map((lang) => (
              <div key={lang.id} style={{ marginBottom: "4px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "rgba(255,255,255,0.85)", fontSize: `${design.fontSize - 0.5}pt` }}>
                  <span style={{ fontWeight: 600 }}>{lang.language}</span>
                  <span style={{ color: design.accentColor, fontSize: `${design.fontSize - 1}pt` }}>
                    {lang.level.charAt(0).toUpperCase() + lang.level.slice(1)}
                  </span>
                </div>
                <div style={{ height: "3px", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: "2px", marginTop: "2px", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      backgroundColor: design.accentColor,
                      borderRadius: "2px",
                      width: lang.level === "native" ? "100%" : lang.level === "fluent" ? "90%" : lang.level === "advanced" ? "75%" : lang.level === "intermediate" ? "55%" : "30%",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right main column */}
      <div
        style={{
          flex: 1,
          padding: `${top}mm ${side}mm`,
          overflowY: "hidden",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {/* Summary */}
        {d.summary.content && (
          <div>
            {mainSectionTitle("Profile")}
            <p style={{ margin: "4px 0 0", fontSize: `${design.fontSize}pt` }}>{d.summary.content}</p>
          </div>
        )}

        {/* Experience */}
        {d.experience.length > 0 && (
          <div>
            {mainSectionTitle("Experience")}
            {d.experience.map((exp) => (
              <div key={exp.id} style={{ marginTop: "6px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700 }}>{exp.position}</span>
                  <span style={{ fontSize: `${design.fontSize - 1}pt`, color: `${design.primaryColor}70` }}>
                    {formatDateRange(exp.startDate, exp.endDate, exp.current)}
                  </span>
                </div>
                <span style={{ color: design.accentColor, fontWeight: 600, fontSize: `${design.fontSize - 0.5}pt` }}>
                  {exp.company}{exp.location ? ` · ${exp.location}` : ""}
                </span>
                {exp.bullets.filter(Boolean).length > 0 && (
                  <ul style={{ margin: "2px 0 0", paddingLeft: "14px" }}>
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
            {mainSectionTitle("Education")}
            {d.education.map((edu) => (
              <div key={edu.id} style={{ marginTop: "5px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700 }}>{edu.degree}{edu.field ? ` in ${edu.field}` : ""}</span>
                  <span style={{ fontSize: `${design.fontSize - 1}pt`, color: `${design.primaryColor}70` }}>
                    {formatDateRange(edu.startDate, edu.endDate, edu.current)}
                  </span>
                </div>
                <span style={{ color: design.accentColor, fontWeight: 500 }}>{edu.institution}</span>
              </div>
            ))}
          </div>
        )}

        {/* Projects */}
        {d.projects.length > 0 && (
          <div>
            {mainSectionTitle("Projects")}
            {d.projects.map((proj) => (
              <div key={proj.id} style={{ marginTop: "5px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700 }}>{proj.name}</span>
                  {proj.techStack.length > 0 && (
                    <span style={{ fontSize: `${design.fontSize - 1.5}pt`, color: `${design.primaryColor}60` }}>
                      {proj.techStack.slice(0, 3).join(" · ")}
                    </span>
                  )}
                </div>
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
            {mainSectionTitle("Certifications")}
            {d.certifications.map((cert) => (
              <div key={cert.id} style={{ display: "flex", justifyContent: "space-between", marginTop: "3px" }}>
                <span style={{ fontWeight: 600 }}>{cert.name}</span>
                <span style={{ fontSize: `${design.fontSize - 1}pt`, color: `${design.primaryColor}70` }}>{cert.issuer}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
