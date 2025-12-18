"use client";

import SamsTemplate from "@/app/components/SamsTemplate";
import { ThickArrowRightIcon } from "@radix-ui/react-icons";

export default function Teacher() {
    return (
        <SamsTemplate links={[
            {
                label: "Dashboard",
                Icon: ThickArrowRightIcon,
                content: <>
                    <div>Dashboard shenanigans</div>
                    <p>More dashboard shenanigans</p>
                    <div>
                        <h1>Even more dashboard shenanigans</h1>
                        <span>With a span inside a div!</span>
                    </div>
                    <button>Click me!</button>
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