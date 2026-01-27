"use client";

import SamsTemplate from "@/app/components/SamsTemplate";
import Image from "next/image";
import { Label, Separator, ToggleGroup } from "radix-ui";
import { useEffect, useRef, useState } from "react";
import './styles.css';
import { Error } from "@/app/components/SamsError";

export default function Admin() {
    type ArchiveItem = {
        created_at: string;
        school_year: string;
        id: string;
        notes: string;
    };

    type ArchiveResponse = {
        success: boolean;
        status: number;
        data: ArchiveItem[];
        error: unknown | null;
    };

    const [archive, setArchive] = useState<ArchiveResponse | null>(null);
    const [selectedYear, setSelectedYear] = useState<string | null>(null);
    const [importStatus, setImportStatus] = useState<string | null>(null);

    const [studentCount, setStudentCount] = useState<number | null>(null);
    const [teacherCount, setTeacherCount] = useState<number | null>(null);
    const [classCount, setClassCount] = useState<number | null>(null);

    const studentFileRef = useRef<HTMLInputElement | null>(null);
    const teacherFileRef = useRef<HTMLInputElement | null>(null);

    async function handleCsvUpload(file: File, endpoint: string) {
        try {
            setImportStatus("Uploading...");
            const form = new FormData();
            form.append('file', file);
            const res = await fetch(endpoint, { method: 'POST', body: form });
            const json = await res.json();
            if (!res.ok || json?.success === false) {
                setImportStatus(`Import failed: ${json?.error ?? res.statusText}`);
                return;
            }
            const imported = Array.isArray(json?.data)
                ? json.data.length
                : (json?.data?.imported ?? 0);
            const invalid = Array.isArray(json?.data?.invalid)
                ? json.data.invalid.length
                : (json?.data?.invalid?.length ?? 0);
            setImportStatus(`Import complete: ${imported} rows, ${invalid} invalid`);
        } catch (err: unknown) {
            let message = 'Unknown error';
            if (err instanceof Error) {
                const error = err as Error;
                message = error.message
            };
            Error(message);
            setImportStatus(`Import error: ${message}`);
        } finally {
            setTimeout(() => setImportStatus(null), 5000);
        }
    }
    useEffect(() => {
        (async () => {
            const res: ArchiveResponse = await fetch('/api/archive').then(res => res.json());
            setArchive(res);
            const years = res?.data ? Array.from(new Set(res.data.map(d => d.school_year))) : [];
            if (years.length) {
                setSelectedYear(years[0]);
            }
            const studentCountRes = await fetch('/api/students/count').then(res => res.json());
            if (studentCountRes?.success) {
                setStudentCount(Number(studentCountRes.data.count));
            }
            const teacherCountRes = await fetch('/api/teachers/count').then(res => res.json());
            if (teacherCountRes?.success) {
                setTeacherCount(Number(teacherCountRes.data.count));
            }
            const classCountRes = await fetch('/api/classes/count').then(res => res.json());
            if (classCountRes?.success) {
                setClassCount(Number(classCountRes.data.count));
            }
        })();
    }, []);
    return (
        <SamsTemplate links={[
            {
                label: "SAMS+ Dataset",
                Icon: () => <Image src="/icons/sheet.svg" alt="" width={20} height={20} />,
                panels: [
                    <div key={1} className="flex justify-center items-center gap-4 h-full">
                        <Image src="/icons/people.svg" alt="" width={40} height={40} />
                        <div className="flex flex-col items-center">
                            <Label.Root className="font-bold">Total Num of Students</Label.Root>
                            <span>{studentCount ?? 'Loading...'}</span>
                        </div>
                    </div>,
                    <div key={2} className="flex justify-center items-center gap-4 h-full">
                        <Image src="/icons/people.svg" alt="" width={40} height={40} />
                        <div className="flex flex-col items-center">
                            <Label.Root className="font-bold">Total Num of Teachers</Label.Root>
                            <span>{teacherCount ?? 'Loading...'}</span>
                        </div>
                    </div>,
                    <div key={3} className="flex justify-center items-center gap-4 h-full">
                        <Image src="/icons/notebook.svg" alt="" width={40} height={40} />
                        <div className="flex flex-col items-center">
                            <Label.Root className="font-bold">Total Num of Classes</Label.Root>
                            <span>{classCount ?? 'Loading...'}</span>
                        </div>
                    </div>
                ],
                content: <>
                    <section className="justify-center items-center flex flex-col gap-4">
                        <div className="flex justify-center items-center mt-1.5">
                            <Label.Root className="font-bold text-2xl">Import</Label.Root>
                            <button className="import-button" onClick={() => studentFileRef.current?.click()}>
                                <Label.Root>Students</Label.Root>
                            </button>
                            <button className="import-button" onClick={() => teacherFileRef.current?.click()}>
                                <Label.Root>Teachers</Label.Root>
                            </button>
                            <button className="import-button">
                                <Label.Root>Schedule</Label.Root>
                            </button>
                            <input
                                ref={studentFileRef}
                                type="file"
                                accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                className="hidden"
                                onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) handleCsvUpload(f, '/api/students');
                                    e.currentTarget.value = '';
                                }}
                            />
                            <input
                                ref={teacherFileRef}
                                type="file"
                                accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                className="hidden"
                                onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) handleCsvUpload(f, '/api/teachers');
                                    e.currentTarget.value = '';
                                }}
                            />
                        </div>
                        {importStatus && (
                            <div className="text-sm opacity-80 mt-2">{importStatus}</div>
                        )}
                        <Separator.Root orientation="horizontal" className="sams-separator" />
                    </section>
                    <section>
                        <ToggleGroup.Root
                            type="single"
                            className="archive-group"
                            value={selectedYear ?? ''}
                            onValueChange={(val) => setSelectedYear(val || null)}
                        >
                            {Array.from(new Set(archive?.data.map(d => d.school_year))).map((year) => (
                                <ToggleGroup.Item key={year} value={year} className="archive-group-item">
                                    {year}
                                </ToggleGroup.Item>
                            ))}
                        </ToggleGroup.Root>
                    </section>
                    <section>
                        <div className="archive">
                            {(() => {
                                const selectedArchives = archive?.data
                                    .filter(d => d.school_year === selectedYear)
                                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                                if (!selectedArchives?.length) return null;
                                return selectedArchives.map((selected) => (
                                    <div key={selected.id} className="archive-item">
                                        <div className="archive-item-header">
                                            <div className="flex flex-col items-start">
                                                <span className="font-bold">School Year: {selected.school_year} - {parseInt(selected.school_year) + 1}</span>
                                                <span className="text-sm opacity-70">Created: {new Date(selected.created_at).toLocaleString()}</span>
                                            </div>
                                        </div>
                                        <div className="archive-item-content">
                                            {selected.notes}
                                        </div>
                                    </div>
                                ));
                            })()}
                        </div>
                    </section>
                </>
            }
        ]} />
    );
}