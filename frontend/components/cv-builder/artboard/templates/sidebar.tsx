"use client";

import type { CvDraft } from "@/lib/cv-builder/types";
import { formatDateRange } from "@/lib/cv-builder/utils";

export function SidebarTemplate({ draft }: { draft: CvDraft }) {
  const { data: d, design } = draft;
  const sideW = 200;
  const fz = design.fontSize;

  const sideHead = (t: string) => (
    <h3 style={{
      fontSize: `${fz}pt`,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.1em",
      color: "#ffffff",
      margin: "12px 0 4px",
      borderBottom: "1px solid rgba(255,255,255,0.3)",
      paddingBottom: 3,
    }}>{t}</h3>
  );

  const mainHead = (t: string) => (
    <div style={{ marginTop: 10, marginBottom: 2 }}>
      <h2 style={{
        fontSize: `${fz + 1}pt`,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: design.primaryColor,
        margin: 0,
        paddingBottom: 3,
        borderBottom: `2px solid ${design.accentColor}`,
      }}>{t}</h2>
    </div>
  );

  return (
    <div style={{
      fontFamily: design.fontFamily,
      fontSize: `${fz}pt`,
      lineHeight: design.lineHeight,
      width: "100%",
      height: "100%",
      display: "flex",
      overflowY: "hidden",
      boxSizing: "border-box",
    }}>
      {/* ─ Sidebar ─ */}
      <div style={{
        width: sideW,
        minWidth: sideW,
        background: design.primaryColor,
        padding: `${design.marginTop}mm 14px`,
        boxSizing: "border-box",
        color: "#fff",
      }}>
        {/* Avatar placeholder circle */}
        <div style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: design.accentColor,
          marginBottom: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "18pt",
          fontWeight: 800,
          color: "#fff",
          letterSpacing: "-1px",
        }}>
          {d.basics.name ? d.basics.name.split(" ").map((n) => n[0]).slice(0, 2).join("") : "JD"}
        </div>

        <h1 style={{ fontSize: `${fz + 4}pt`, fontWeight: 900, margin: 0, color: "#fff", lineHeight: 1.2 }}>
          {d.basics.name || "Your Name"}
        </h1>
        {d.basics.headline && (
          <p style={{ margin: "4px 0 0", fontSize: `${fz - 0.5}pt`, color: design.accentColor, fontWeight: 600 }}>
            {d.basics.headline}
          </p>
        )}

        {sideHead("Contact")}
        {[
          d.basics.email,
          d.basics.phone,
          d.basics.location,
          d.basics.linkedin ? d.basics.linkedin.replace("https://", "") : "",
          d.basics.github   ? d.basics.github.replace("https://", "")   : "",
        ].filter(Boolean).map((v, i) => (
          <p key={i} style={{ margin: "2px 0", fontSize: `${fz - 1}pt`, color: "rgba(255,255,255,0.8)", wordBreak: "break-all" }}>{v}</p>
        ))}

        {d.skills.length > 0 && (
          <>
            {sideHead("Skills")}
            {d.skills.map((g) => (
              <div key={g.id} style={{ marginBottom: 4 }}>
                {g.category && <p style={{ margin: "0 0 2px", fontSize: `${fz - 1}pt`, fontWeight: 700, color: design.accentColor }}>{g.category}</p>}
                {g.items.map((item, i) => (
                  <p key={i} style={{ margin: "1px 0", fontSize: `${fz - 1.5}pt`, color: "rgba(255,255,255,0.85)" }}>{item}</p>
                ))}
              </div>
            ))}
          </>
        )}

        {d.languages.length > 0 && (
          <>
            {sideHead("Languages")}
            {d.languages.map((lang) => (
              <p key={lang.id} style={{ margin: "2px 0", fontSize: `${fz - 1}pt`, color: "rgba(255,255,255,0.85)" }}>
                <strong>{lang.language}</strong> — {lang.level.charAt(0).toUpperCase() + lang.level.slice(1)}
              </p>
            ))}
          </>
        )}

        {d.certifications.length > 0 && (
          <>
            {sideHead("Certifications")}
            {d.certifications.map((cert) => (
              <p key={cert.id} style={{ margin: "2px 0", fontSize: `${fz - 1.5}pt`, color: "rgba(255,255,255,0.85)" }}>
                {cert.name}
              </p>
            ))}
          </>
        )}
      </div>

      {/* ─ Main ─ */}
      <div style={{
        flex: 1,
        padding: `${design.marginTop}mm ${design.marginSide}mm ${design.marginTop}mm 16px`,
        boxSizing: "border-box",
        overflowY: "hidden",
        color: design.primaryColor,
      }}>
        {d.summary.content && (
          <div>
            {mainHead("Profile")}
            <p style={{ margin: "4px 0 0" }}>{d.summary.content}</p>
          </div>
        )}

        {d.experience.length > 0 && (
          <div>
            {mainHead("Experience")}
            {d.experience.map((exp) => (
              <div key={exp.id} style={{ marginTop: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700 }}>{exp.position}</span>
                  <span style={{ fontSize: `${fz - 1}pt`, color: `${design.primaryColor}80` }}>
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

        {d.education.length > 0 && (
          <div>
            {mainHead("Education")}
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
            {mainHead("Projects")}
            {d.projects.map((proj) => (
              <div key={proj.id} style={{ marginTop: 5 }}>
                <span style={{ fontWeight: 700 }}>{proj.name}</span>
                {proj.techStack.length > 0 && (
                  <span style={{ fontSize: `${fz - 1}pt`, color: `${design.primaryColor}80`, marginLeft: 6 }}>
                    {proj.techStack.join(" · ")}
                  </span>
                )}
                {proj.bullets.filter(Boolean).map((b, i) => (
                  <li key={i} style={{ listStyle: "disc", marginLeft: 14, fontSize: `${fz - 0.5}pt` }}>{b}</li>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
