"use client";

import SamsTemplate from "@/app/components/SamsTemplate";
import { CopyIcon } from "@radix-ui/react-icons";
import Image from "next/image";
import { Label } from "radix-ui";

export default function Admin() {
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
                    Dashboard shenanigans
                </>
            }
        ]} />
    );
}