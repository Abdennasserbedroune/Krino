import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderToStream } from '@react-pdf/renderer';
import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
    page: { flexDirection: 'column', backgroundColor: '#FFFFFF', padding: 30, fontFamily: 'Helvetica' },
    header: { borderBottomWidth: 2, borderBottomColor: '#E5E7EB', paddingBottom: 8, marginBottom: 16 },
    name: { fontSize: 24, fontWeight: 'bold' },
    title: { fontSize: 14, color: '#4B5563', marginTop: 4 },
    contact: { fontSize: 10, color: '#4B5563', marginTop: 8 },
    section: { marginTop: 16 },
    sectionTitle: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', color: '#374151', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingBottom: 4, marginBottom: 6 },
    summaryText: { fontSize: 10, lineHeight: 1.5, color: '#111827' },
    roleRow: { marginTop: 8 },
    roleHeader: { flexDirection: 'row', justifyContent: 'space-between' },
    roleCompanyGroup: { flexDirection: 'row' },
    roleCompany: { fontSize: 10, fontWeight: 'bold', color: '#111827' },
    roleLocation: { fontSize: 10, color: '#6B7280', marginLeft: 4 },
    roleDates: { fontSize: 9, color: '#6B7280' },
    roleBullets: { marginTop: 4, paddingLeft: 12 },
    bullet: { fontSize: 9, lineHeight: 1.4, marginBottom: 2 },
    eduItem: { marginTop: 6 },
    eduDegree: { fontSize: 10, fontWeight: 'bold' },
    eduSchool: { fontSize: 9, color: '#4B5563' },
    eduDates: { fontSize: 9, color: '#6B7280' },
    skillRow: { flexDirection: 'row', marginTop: 2 },
    skillLabel: { fontSize: 9, fontWeight: 'bold', color: '#374151' },
    skillValue: { fontSize: 9, color: '#111827', marginLeft: 4 }
});

const CVDocument = ({ data }: { data: any }) => {
    const personal = data.personal_info || {};
    const summary = data.summary || "";
    const experience = data.experience || [];
    const education = data.education || [];
    const skills = data.skills || {};

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <Text style={styles.name}>{personal.name || 'Candidate Name'}</Text>
                    <Text style={styles.title}>{personal.title || ''}</Text>
                    <Text style={styles.contact}>
                        {personal.email || ''} | {personal.phone || ''} | {personal.location || ''}
                    </Text>
                </View>

                {summary ? (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Summary</Text>
                        <Text style={styles.summaryText}>{summary}</Text>
                    </View>
                ) : null}

                {experience.length > 0 ? (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Experience</Text>
                        {experience.map((item: any, i: number) => (
                            <View key={i} style={styles.roleRow}>
                                <View style={styles.roleHeader}>
                                    <View style={styles.roleCompanyGroup}>
                                        <Text style={styles.roleCompany}>{item.role}</Text>
                                        <Text style={styles.roleLocation}>{item.company ? `, ${item.company}` : ''}</Text>
                                    </View>
                                    <Text style={styles.roleDates}>{item.start_date} - {item.end_date}</Text>
                                </View>
                                <View style={styles.roleBullets}>
                                    {(item.bullets || []).map((b: string, j: number) => (
                                        <Text key={j} style={styles.bullet}>• {b}</Text>
                                    ))}
                                </View>
                            </View>
                        ))}
                    </View>
                ) : null}

                {education.length > 0 ? (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Education</Text>
                        {education.map((edu: any, i: number) => (
                            <View key={i} style={styles.eduItem}>
                                <Text style={styles.eduDegree}>{edu.degree}</Text>
                                <Text style={styles.eduSchool}>{edu.school}</Text>
                                <Text style={styles.eduDates}>{edu.start_date} - {edu.end_date}</Text>
                            </View>
                        ))}
                    </View>
                ) : null}

                {Object.keys(skills).length > 0 ? (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Skills</Text>
                        {Object.entries(skills).map(([label, values]: any, i: number) => (
                            <View key={i} style={styles.skillRow}>
                                <Text style={styles.skillLabel}>{label}:</Text>
                                <Text style={styles.skillValue}>{Array.isArray(values) ? values.join(', ') : ''}</Text>
                            </View>
                        ))}
                    </View>
                ) : null}
            </Page>
        </Document>
    );
};


export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
        }

        const id = parseInt(params.id, 10);
        if (isNaN(id)) {
            return NextResponse.json({ detail: "Invalid CV ID" }, { status: 400 });
        }

        const { data: cv, error: dbError } = await supabase
            .from("cvs")
            .select("structured_data")
            .eq("id", id)
            .eq("user_id", user.id)
            .single();

        if (dbError || !cv) {
            return NextResponse.json({ detail: "CV not found" }, { status: 404 });
        }

        const template = req.nextUrl.searchParams.get('template') || 'classic';
        const structured = cv.structured_data || {};

        const stream = await renderToStream(<CVDocument data={structured} />);

        return new NextResponse(stream as unknown as ReadableStream, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="cv_${id}_${template}.pdf"`
            },
        });

    } catch (error: any) {
        console.error("PDF Generate Error:", error);
        return NextResponse.json({ detail: "Internal Server Error" }, { status: 500 });
    }
}
