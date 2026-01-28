"use client";

import SamsTemplate from "@/app/components/SamsTemplate";
import Image from "next/image";
import { Label, Separator, ToggleGroup } from "radix-ui";
import { useEffect, useRef, useState } from "react";
import './styles.css';
import { Error } from "@/app/components/SamsError";
import { TrashIcon } from "@radix-ui/react-icons";

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

    const groupSize = 6;

    const [archive, setArchive] = useState<ArchiveResponse | null>(null);
    const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
    const [importStatus, setImportStatus] = useState<string | null>(null);

    const [studentCount, setStudentCount] = useState<number | null>(null);
    const [teacherCount, setTeacherCount] = useState<number | null>(null);
    const [classCount, setClassCount] = useState<number | null>(null);

    const [schoolYear, setSchoolYear] = useState<string>('');
    const [archiveNotes, setArchiveNotes] = useState<string>('');
    const [archiveLoading, setArchiveLoading] = useState<boolean>(false);

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

    async function handleCreateArchive() {
        if (!schoolYear.trim() || !archiveNotes.trim()) {
            setImportStatus('School year and notes are required');
            setTimeout(() => setImportStatus(null), 5000);
            return;
        }

        try {
            setArchiveLoading(true);
            const form = new FormData();
            form.append('school_year', schoolYear);
            form.append('notes', archiveNotes);

            const res = await fetch('/api/archive', { method: 'POST', body: form });
            const json = await res.json();

            if (!res.ok || json?.success === false) {
                setImportStatus(`Archive creation failed: ${json?.error ?? res.statusText}`);
                setTimeout(() => setImportStatus(null), 5000);
                return;
            }

            setImportStatus('Archive created successfully');
            setSchoolYear('');
            setArchiveNotes('');
            setTimeout(() => setImportStatus(null), 5000);

            // Refresh archive list
            const archiveRes: ArchiveResponse = await fetch('/api/archive').then(res => res.json());
            setArchive(archiveRes);
            if (archiveRes?.data?.length) {
                setSelectedGroup(0);
            }
        } catch (err: unknown) {
            let message = 'Unknown error';
            if (err instanceof Error) {
                const error = err as Error;
                message = error.message;
            }
            setImportStatus(`Archive creation error: ${message}`);
            setTimeout(() => setImportStatus(null), 5000);
        } finally {
            setArchiveLoading(false);
        }
    }

    async function handleDeleteArchive(archiveId: string) {
        try {
            const form = new FormData();
            form.append('id', archiveId);

            const res = await fetch('/api/archive', {
                method: 'DELETE',
                body: form
            });
            const json = await res.json();

            if (!res.ok || json?.success === false) {
                setImportStatus(`Archive deletion failed: ${json?.error ?? res.statusText}`);
                setTimeout(() => setImportStatus(null), 5000);
                return;
            }

            setImportStatus('Archive deleted successfully');
            setTimeout(() => setImportStatus(null), 5000);

            // Refresh archive list
            const archiveRes: ArchiveResponse = await fetch('/api/archive').then(res => res.json());
            setArchive(archiveRes);
            if (archiveRes?.data?.length) {
                setSelectedGroup(Math.max(0, (selectedGroup ?? 0) - 1));
            } else {
                setSelectedGroup(null);
            }
        } catch (err: unknown) {
            let message = 'Unknown error';
            if (err instanceof Error) {
                const error = err as Error;
                message = error.message;
            }
            setImportStatus(`Archive deletion error: ${message}`);
            setTimeout(() => setImportStatus(null), 5000);
        }
    }
    useEffect(() => {
        (async () => {
            const res: ArchiveResponse = await fetch('/api/archive').then(res => res.json());
            setArchive(res);
            // Set first group as selected
            if (res?.data?.length) {
                setSelectedGroup(0);
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
                    <div key={1} className="stats-card">
                        <Image src="/icons/people.svg" alt="" width={40} height={40} />
                        <div className="stats-icon-group">
                            <Label.Root className="font-bold">Total Num of Students</Label.Root>
                            <span>{studentCount ?? 'Loading...'}</span>
                        </div>
                    </div>,
                    <div key={2} className="stats-card">
                        <Image src="/icons/people.svg" alt="" width={40} height={40} />
                        <div className="stats-icon-group">
                            <Label.Root className="font-bold">Total Num of Teachers</Label.Root>
                            <span>{teacherCount ?? 'Loading...'}</span>
                        </div>
                    </div>,
                    <div key={3} className="stats-card">
                        <Image src="/icons/notebook.svg" alt="" width={40} height={40} />
                        <div className="stats-icon-group">
                            <Label.Root className="font-bold">Total Num of Classes</Label.Root>
                            <span>{classCount ?? 'Loading...'}</span>
                        </div>
                    </div>
                ],
                content: <>
                    <section className="import-section">
                        <div className="import-header">
                            <Label.Root className="import-section-title">Import</Label.Root>
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
                            <div className="import-status">{importStatus}</div>
                        )}
                        <Separator.Root orientation="horizontal" className="sams-separator" />
                    </section>
                    <div className="admin-content">
                        <div className="archive-form">
                            <Label.Root className="archive-form-title">Create Archive</Label.Root>
                            <div className="archive-form-container w-full">
                                <div className="form-field-group">
                                    <Label.Root className="form-field-label">School Year</Label.Root>
                                    <input
                                        type="text"
                                        placeholder="e.g., 2024"
                                        value={schoolYear}
                                        onChange={(e) => setSchoolYear(e.target.value)}
                                        className="school-year-input"
                                    />
                                </div>
                                <div className="form-field-group">
                                    <Label.Root className="form-field-label">Notes</Label.Root>
                                    <textarea
                                        placeholder="Add notes about this archive..."
                                        value={archiveNotes}
                                        onChange={(e) => setArchiveNotes(e.target.value)}
                                        className="archive-notes-textarea"
                                        rows={3}
                                    />
                                </div>
                                <button
                                    onClick={handleCreateArchive}
                                    disabled={archiveLoading}
                                    className="import-button" style={{ marginTop: '0.5rem' }}
                                >
                                    <Label.Root>{archiveLoading ? 'Creating...' : 'Create Archive'}</Label.Root>
                                </button>
                            </div>
                        </div>
                        <div>
                            <section>
                                <ToggleGroup.Root
                                    type="single"
                                    className="archive-group"
                                    value={selectedGroup?.toString() ?? ''}
                                    onValueChange={(val) => setSelectedGroup(val ? parseInt(val) : null)}
                                >
                                    {(() => {
                                        const totalArchives = archive?.data?.length ?? 0;
                                        const numGroups = Math.ceil(totalArchives / 6);
                                        return Array.from({ length: numGroups }, (_, i) => (
                                            <ToggleGroup.Item key={i} value={i.toString()} className="archive-group-item">
                                                {i + 1}
                                            </ToggleGroup.Item>
                                        ));
                                    })()}
                                </ToggleGroup.Root>
                            </section>
                            <section>
                                <div className="archive">
                                    {(() => {
                                        const allArchives = archive?.data
                                            ?.sort((a, b) => {
                                                // First sort by school year (descending)
                                                if (a.school_year !== b.school_year) {
                                                    return parseInt(b.school_year) - parseInt(a.school_year);
                                                }
                                                // Then sort by creation date (descending)
                                                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                                            });
                                        if (!allArchives?.length || selectedGroup === null) return null;

                                        // Divide archives into groups of 6
                                        const startIdx = selectedGroup * groupSize;
                                        const endIdx = startIdx + groupSize;
                                        const selectedArchives = allArchives.slice(startIdx, endIdx);

                                        return selectedArchives.map((selected) => (
                                            <div key={selected.id} className="archive-item">
                                                <div className="archive-item-header">
                                                    <div className="archive-metadata">
                                                        <span className="archive-year-info">School Year: {selected.school_year} - {parseInt(selected.school_year) + 1}</span>
                                                        <span className="archive-created-info">Created: {new Date(selected.created_at).toLocaleString()}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => handleDeleteArchive(selected.id)}
                                                        className="archive-delete-button"
                                                    >
                                                        <TrashIcon />
                                                    </button>
                                                </div>
                                                <div className="archive-item-content">
                                                    {selected.notes}
                                                </div>
                                            </div>
                                        ));
                                    })()}
                                </div>
                            </section>
                        </div>
                    </div>
                </>
            }
        ]} />
    );
}