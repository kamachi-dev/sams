"use client";

import SamsTemplate from "@/app/components/SamsTemplate";
import { ThickArrowRightIcon } from "@radix-ui/react-icons";

export default function Teacher() {
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