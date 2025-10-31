import React from "react";
import Image from "next/image";
import { Popover, Separator, Tabs } from "radix-ui";
import { GearIcon, ExitIcon, Half2Icon } from "@radix-ui/react-icons";
import DynamicTitle from "./DynamicTitle";
import Link from "next/link";
import DynamicTheme from "./DynamicTheme";

interface Props {
    links: { label: string; Icon: React.ElementType; content: React.ReactNode }[];
}

export default function SamsTemplate({ links }: Props) {
    const defaultTab = links && links.length > 0 ? links[0].label : undefined;

    return (
        <Tabs.Root defaultValue={defaultTab} className="sams">
            <nav className="sams-nav">
                <div className="sams-nav-header">
                    <div className="sams-nav-header-logo">
                        <Image
                            src="/images/mmcl-logo-extended.png"
                            alt="SAMS Logo"
                            fill
                        />
                    </div>
                    <DynamicTitle />
                </div>
                <div className="sams-nav-pfp">
                    <Image
                        src="/icons/placeholder-pfp.png"
                        alt="Profile Picture"
                        fill
                    />
                </div>
                <h2 className="sams-nav-username">Guest</h2>
                <p className="sams-nav-email">guest@example.com</p>
                <Separator.Root className="sams-separator" decorative style={{ margin: "0 15px" }} />
                <Tabs.List className="sams-nav-links">
                    {links.map(({ label, Icon }) => (
                        <Tabs.Trigger key={label} value={label} className="sams-nav-link">
                            <Icon /> {label}
                        </Tabs.Trigger>
                    ))}
                </Tabs.List>
                <Popover.Root>
                    <Popover.Trigger className="sams-nav-settings">
                        <GearIcon /> Settings
                    </Popover.Trigger>
                    <Popover.Portal>
                        <Popover.Content className="sams-nav-settings-content">
                            <div className="flex items-center justify-between">
                                <Half2Icon className="mr-2" />
                                Dark Mode
                                <DynamicTheme />
                            </div>
                            <Popover.Arrow className="sams-nav-settings-arrow" />
                            <Link href="/"><ExitIcon className="mr-2" />Signout</Link>
                        </Popover.Content>
                    </Popover.Portal>
                </Popover.Root>
            </nav>
            {links.map(({ label, content }) => (
                <Tabs.Content key={label} value={label} className="sams-content">
                    {content}
                </Tabs.Content>
            ))}
        </Tabs.Root>
    );
}
