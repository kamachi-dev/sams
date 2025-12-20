"use client";

import SamsTemplate from "@/app/components/SamsTemplate";
import { ThickArrowRightIcon } from "@radix-ui/react-icons";

export default function Student() {
    return (
        <SamsTemplate links={[
            {
                label: "Dashboard",
                Icon: ThickArrowRightIcon,
                panels: [
                    <div key={1}>Panel 1</div>,
                    <div key={2}>Panel 2</div>
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