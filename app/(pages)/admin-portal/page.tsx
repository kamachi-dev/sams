"use client";

import SamsTemplate from "@/app/components/SamsTemplate";
import { CopyIcon, ThickArrowRightIcon } from "@radix-ui/react-icons";

export default function Admin() {
    return (
        <SamsTemplate links={[
            {
                label: "Dashboard",
                Icon: ThickArrowRightIcon,
                panels: [
                    <div key={1}>WAHA</div>,
                    <div key={2}>I love Lasagna</div>,
                    <div key={2}>Panel 2 <CopyIcon /> TEST TEST</div>
                ],
                content: <>
                    Dashboard shenanigans
                </>
            },
            {
                label: "Notifications",
                Icon: ThickArrowRightIcon,
                panels: [
                    <div key={1}>Panel 1</div>,
                    <div key={2}>Panel 2</div>
                ],
                content: <>
                    You got mail
                </>
            }
        ]} />
    );
}