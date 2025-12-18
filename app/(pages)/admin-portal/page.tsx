"use client";

import SamsTemplate from "@/app/components/SamsTemplate";
import { ThickArrowRightIcon } from "@radix-ui/react-icons";

export default function Admin() {
    return (
        <SamsTemplate links={[
            {
                label: "Dashboard",
                Icon: ThickArrowRightIcon,
                content: <>
                    Dashboard shenanigans
                </>
            },
            {
                label: "Notifications",
                Icon: ThickArrowRightIcon,
                content: <>
                    You got mail
                </>
            }
        ]} />
    );
}