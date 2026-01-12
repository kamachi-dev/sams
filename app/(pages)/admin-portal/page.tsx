"use client";

import SamsTemplate from "@/app/components/SamsTemplate";
import Image from "next/image";
import { Label, Separator, ToggleGroup } from "radix-ui";
import { useState } from "react";
import './styles.css';

export default function Admin() {
    const groups = ["1", "2", "3", "4", "5"];
    const [selectedGroup, setSelectedGroup] = useState<string>(groups[0]);
    const notesByGroup: Record<string, [string, string][]> = {
        "1": [
            ["Note 1-A", "descriptive content"],
            ["Note 1-B", "descriptive content"],
            ["Note 1-C", "descriptive content"],
            ["Note 1-D", "descriptive content"],
            ["Note 1-E", "descriptive content"],
            ["Note 1-F", "descriptive content"],
        ],
        "2": [
            ["Note 2-A", "descriptive content"],
            ["Note 2-B", "descriptive content"],
            ["Note 2-C", "descriptive content"],
            ["Note 2-D", "descriptive content"],
            ["Note 2-E", "descriptive content"],
            ["Note 2-F", "descriptive content"],
        ],
        "3": [
            ["Note 3-A", "descriptive content"],
            ["Note 3-B", "descriptive content"],
            ["Note 3-C", "descriptive content"],
            ["Note 3-D", "descriptive content"],
            ["Note 3-E", "descriptive content"],
            ["Note 3-F", "descriptive content"],
        ],
        "4": [
            ["Note 4-A", "descriptive content"],
            ["Note 4-B", "descriptive content"],
            ["Note 4-C", "descriptive content"],
            ["Note 4-D", "descriptive content"],
            ["Note 4-E", "descriptive content"],
            ["Note 4-F", "descriptive content"],
        ],
        "5": [
            ["Note 5-A", "descriptive content"],
            ["Note 5-B", "descriptive content"],
            ["Note 5-C", "descriptive content"],
            ["Note 5-D", "descriptive content"],
            ["Note 5-E", "descriptive content"],
            ["Note 5-F", "descriptive content"],
        ],
    };
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
                            <span>1500</span>
                        </div>
                    </div>,
                    <div key={2} className="flex justify-center items-center gap-4 h-full">
                        <Image src="/icons/people.svg" alt="" width={40} height={40} />
                        <div className="flex flex-col items-center">
                            <Label.Root className="font-bold">Total Num of Teachers</Label.Root>
                            <span>1500</span>
                        </div>
                    </div>,
                    <div key={3} className="flex justify-center items-center gap-4 h-full">
                        <Image src="/icons/notebook.svg" alt="" width={40} height={40} />
                        <div className="flex flex-col items-center">
                            <Label.Root className="font-bold">Total Num of Classes</Label.Root>
                            <span>1500</span>
                        </div>
                    </div>
                ],
                content: <>
                    <section className="justify-center items-center flex flex-col gap-4">
                        <div className="flex justify-center items-center mt-1.5">
                            <Label.Root className="font-bold text-2xl">Import</Label.Root>
                            <button className="import-button">
                                <Label.Root>Students</Label.Root>
                            </button>
                            <button className="import-button">
                                <Label.Root>Teachers</Label.Root>
                            </button>
                            <button className="import-button">
                                <Label.Root>Schedule</Label.Root>
                            </button>
                        </div>
                        <Separator.Root orientation="horizontal" className="sams-separator" />
                    </section>
                    <section>
                        <ToggleGroup.Root
                            type="single"
                            className="archive-group"
                            value={selectedGroup}
                            onValueChange={(val) => val && setSelectedGroup(val)}
                        >
                            {groups.map((value) => (
                                <ToggleGroup.Item key={value} value={value} className="archive-group-item">
                                    {value}
                                </ToggleGroup.Item>
                            ))}
                        </ToggleGroup.Root>
                    </section>
                    <section>
                        <div className="archive">
                            {notesByGroup[selectedGroup]?.map((note, idx) => (
                                <div key={`${selectedGroup}-${idx}`} className="archive-item">
                                    <div className="archive-item-header">
                                        {note[0]}
                                    </div>
                                    <div className="archive-item-content">
                                        {note[1]}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </>
            }
        ]} />
    );
}