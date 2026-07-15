'use client';

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Popover, Separator, Tabs, Switch } from "radix-ui";
import { GearIcon, ExitIcon, Half2Icon, HamburgerMenuIcon, Cross2Icon, BellIcon } from "@radix-ui/react-icons";
import { useAuth, SignOutButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { usePathname } from 'next/navigation';
import { Error } from "@/app/components/SamsError";
import { useRouter } from "next/navigation";
import NotificationSettings from "@/app/components/NotificationSettings";


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
    activeTab?: string;
    onTabChange?: (tab: string) => void;
    navContent?: React.ReactNode;
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

export default function SamsTemplate({ links, activeTab, onTabChange, navContent }: Props) {
    const { isLoaded, isSignedIn } = useAuth();
    const defaultTab = links && links.length > 0 ? links[0].label : undefined;
    const pathname = usePathname() ?? '';
    const showEmailNotifications = pathname.includes('/parent-portal') || pathname.includes('/student-portal');
    const title = React.useMemo(() => formatPathname(pathname), [pathname]);
    const [user, setUser] = React.useState<Account | null>(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showNotificationSettings, setShowNotificationSettings] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const router = useRouter();

    useEffect(() => {
        (async () => {
            try {
                const userData = await getUserData();
                setUser(userData);
            } catch {
                Error('Failed to load user data');
            }
        })();
    }, []);

    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            Error('You have been signed out. Redirecting to login page.');
            router.replace('/');
        }
    }, [isLoaded, isSignedIn, router]);

    useEffect(() => {
        setIsDarkMode(document.documentElement.classList.contains('dark'));
    }, []);

    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false);
    };

    const handleThemeChange = (checked: boolean) => {
        toggleTheme(checked);
        setIsDarkMode(checked);
    };

    return (
        <Tabs.Root
            {...(activeTab ? { value: activeTab, onValueChange: onTabChange } : { defaultValue: defaultTab })}
            className="sams"
        >
            <nav className={`sams-nav ${isMobileMenuOpen ? 'sams-nav-mobile-open' : ''}`}>
                <div className="sams-nav-header">
                    <button
                        className="sams-mobile-menu-toggle"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        aria-label="Toggle menu"
                    >
                        {isMobileMenuOpen ? <Cross2Icon /> : <HamburgerMenuIcon />}
                    </button>
                    <div className="sams-nav-header-logo">
                        <Image
                            src="/images/mmcl-logo-extended.png"
                            alt="SAMS Logo"
                            width={120}
                            height={40}
                        />
                    </div>
                    <h1 className="sams-nav-header-title">{title}</h1>
                </div>

                <div className="sams-nav-body">
                    <div className="sams-nav-profile">
                        <div className="sams-nav-pfp flex items-center justify-center">
                            <SignedIn>
                                <Image src={user?.pfp ?? "/icons/placeholder-pfp.png"} alt="Profile Picture" width={100} height={100} />
                            </SignedIn>
                            <SignedOut>
                                <Image src="/icons/placeholder-pfp.png" alt="Profile Picture" width={100} height={100} />
                            </SignedOut>
                        </div>
                        <div className="sams-nav-profile-info">
                            <h2 className="sams-nav-username">{user?.username ?? "Guest"}</h2>
                            <p className="sams-nav-email">{user?.email ?? "guest@example.com"}</p>
                        </div>
                    </div>
                    
                    <Separator.Root className="sams-separator" decorative style={{ margin: "0 15px" }} />
                    
                    <Tabs.List className="sams-nav-links">
                        {links.map(({ label, Icon }) => (
                            <Tabs.Trigger
                                key={label}
                                value={label}
                                className="sams-nav-link"
                                onClick={closeMobileMenu}
                            >
                                <Icon className="sams-nav-icon" />
                                <span>{label}</span>
                            </Tabs.Trigger>
                        ))}
                    </Tabs.List>
                    
                    <Separator.Root className="sams-separator sams-nav-bottom-separator" decorative style={{ margin: "0 15px" }} />

                    {navContent && <div className="sams-nav-custom-content">{navContent}</div>}

                    {/* Desktop Settings (Popover) */}
                    <Popover.Root>
                        <Popover.Trigger className="sams-nav-settings sams-desktop-only">
                            <GearIcon /> <span>Settings</span>
                        </Popover.Trigger>
                        <Popover.Portal>
                            <Popover.Content className="sams-nav-settings-content">
                                <div 
                                    className="flex items-center justify-between cursor-pointer hover:opacity-80 w-full"
                                    onClick={() => setShowNotificationSettings(true)}
                                    role="button"
                                    tabIndex={0}
                                    style={{ padding: '8px 0', marginBottom: '8px', borderBottom: '1px solid var(--foreground3)' }}
                                >
                                    <span className="flex items-center"><BellIcon className="mr-2" /> Notifications</span>
                                </div>
                                <div className="flex items-center justify-between w-full" style={{ padding: '8px 0', marginBottom: '8px' }}>
                                    <span className="flex items-center"><Half2Icon className="mr-2" /> Dark Mode</span>
                                    <Switch.Root 
                                        className="sams-nav-settings-switch" 
                                        checked={isDarkMode}
                                        onCheckedChange={handleThemeChange}
                                    >
                                        <Switch.Thumb className="sams-nav-settings-switch-thumb" />
                                    </Switch.Root>
                                </div>
                                <Popover.Arrow className="sams-nav-settings-arrow" />
                                <SignOutButton redirectUrl="/">
                                    <span className="flex items-center cursor-pointer w-full text-red-500 hover:opacity-80" style={{ padding: '8px 0' }}>
                                        <ExitIcon className="mr-2" /> Sign out
                                    </span>
                                </SignOutButton>
                            </Popover.Content>
                        </Popover.Portal>
                    </Popover.Root>

                    {/* Mobile Settings (Inline) */}
                    <div className="sams-mobile-settings sams-mobile-only">
                        <div 
                            className="sams-mobile-settings-item"
                            onClick={() => { setShowNotificationSettings(true); closeMobileMenu(); }}
                            role="button"
                            tabIndex={0}
                        >
                            <BellIcon className="mr-2" />
                            <span>Notifications</span>
                        </div>
                        <div className="sams-mobile-settings-item">
                            <div className="flex items-center">
                                <Half2Icon className="mr-2" />
                                <span>Dark Mode</span>
                            </div>
                            <Switch.Root 
                                className="sams-nav-settings-switch" 
                                checked={isDarkMode}
                                onCheckedChange={handleThemeChange}
                            >
                                <Switch.Thumb className="sams-nav-settings-switch-thumb" />
                            </Switch.Root>
                        </div>
                        <SignOutButton redirectUrl="/">
                            <div className="sams-mobile-settings-item text-red-500">
                                <ExitIcon className="mr-2" />
                                <span>Sign out</span>
                            </div>
                        </SignOutButton>
                    </div>
                </div>
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
            <NotificationSettings 
                isOpen={showNotificationSettings} 
                onClose={() => setShowNotificationSettings(false)} 
                showEmailNotifications={showEmailNotifications}
            />
        </Tabs.Root>
    );
}
