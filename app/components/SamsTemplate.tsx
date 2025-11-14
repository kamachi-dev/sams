'use client';

import React from "react";
import Image from "next/image";
import { Popover, Separator, Tabs, Switch } from "radix-ui";
import { GearIcon, ExitIcon, Half2Icon } from "@radix-ui/react-icons";
import { SignOutButton, UserButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { usePathname } from 'next/navigation';

interface Props {
    links: { label: string; Icon: React.ElementType; content: React.ReactNode }[];
}

function toggleTheme(checked: boolean) {
    document.documentElement.classList.toggle('dark', checked);
}

function formatPathname(path = '') {
    return path
        .replace(/^\//, '')
        .replace(/-([a-z])/g, (_, c) => ' ' + c.toUpperCase())
        .replace(/^./, (c: string) => c.toUpperCase());
}

export default function SamsTemplate({ links }: Props) {
    const defaultTab = links && links.length > 0 ? links[0].label : undefined;
    const pathname = usePathname() ?? '';
    const title = React.useMemo(() => formatPathname(pathname), [pathname]);

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
                    <h1 className="sams-nav-header-title">{title}</h1>
                </div>
                <div className="sams-nav-pfp flex items-center justify-center">
                    <SignedIn>
                        <UserButton appearance={{ elements: { avatarBox: { width: 40, height: 40 } } }} />
                    </SignedIn>
                    <SignedOut>
                        <Image src="/icons/placeholder-pfp.png" alt="Profile Picture" fill />
                    </SignedOut>
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
                                <Switch.Root className="sams-nav-settings-switch" onCheckedChange={(checked) => toggleTheme(checked)}>
                                    <Switch.Thumb className="sams-nav-settings-switch-thumb" />
                                </Switch.Root>
                            </div>
                            <Popover.Arrow className="sams-nav-settings-arrow" />
                            <SignOutButton redirectUrl="/">
                                <span className="flex items-center cursor-pointer"><ExitIcon className="mr-2" />Sign out</span>
                            </SignOutButton>
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
