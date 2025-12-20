'use client';

import React, { useEffect } from "react";
import Image from "next/image";
import { Popover, Separator, Tabs, Switch } from "radix-ui";
import { GearIcon, ExitIcon, Half2Icon } from "@radix-ui/react-icons";
import { SignOutButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { usePathname } from 'next/navigation';
import { Error } from "@/app/components/SamsError";


type Account = {
    id: string
    username: string
    email: string
    pfp: string | null
    role: number
    created_at: string
}

interface Props {
    links: {
        label: string;
        Icon: React.ElementType;
        panels: React.ReactNode[];
        content: React.ReactNode
    }[];
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

async function getUserData() {
    let user: Account | null = null;
    await fetch('/api/user')
        .then(res => res.json())
        .then(data => {
            if (data.success) user = data.data as Account
            else Error(data.error || 'Failed to fetch user data');
        });
    return user;
}

export default function SamsTemplate({ links }: Props) {
    const defaultTab = links && links.length > 0 ? links[0].label : undefined;
    const pathname = usePathname() ?? '';
    const title = React.useMemo(() => formatPathname(pathname), [pathname]);
    const [user, setUser] = React.useState<Account | null>(null);

    useEffect(() => {
        (async () => {
            const userData = await getUserData();
            setUser(userData);
        })();
    }, []);

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
                        <Image src={user?.pfp ?? "/icons/placeholder-pfp.png"} alt="Profile Picture" fill />
                    </SignedIn>
                    <SignedOut>
                        <Image src="/icons/placeholder-pfp.png" alt="Profile Picture" fill />
                    </SignedOut>
                </div>
                <h2 className="sams-nav-username">{user?.username ?? "Guest"}</h2>
                <p className="sams-nav-email">{user?.email ?? "guest@example.com"}</p>
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
            {links.map(({ label, content, panels }) => (
                <Tabs.Content key={label} value={label} className="sams-content">
                    <div className="sams-content-header">
                        <h1 className="sams-content-title">{label}</h1>
                        <h2 className="sams-content-subtitle">Welcome to <span className="sams-content-subtitle-highlight">Student Attendance Management System SAMS+</span></h2>
                        <div className="sams-content-panels">
                            {
                                panels.map((panel, index) => (
                                    <div key={index} className="sams-content-panel">
                                        {panel}
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                    <div className="sams-content-body">{content}</div>
                </Tabs.Content>
            ))}
        </Tabs.Root>
    );
}
