'use client';
import React from 'react';
import { usePathname } from 'next/navigation';

function formatPathname(path = '') {
    return path
        .replace(/^\//, '')
        .replace(/-([a-z])/g, (_, c) => ' ' + c.toUpperCase())
        .replace(/^./, (c: string) => c.toUpperCase());
}

export default function DynamicTitle() {
    const pathname = usePathname() ?? '';
    const title = React.useMemo(() => formatPathname(pathname), [pathname]);

    return <h1 className="sams-nav-header-title">{title}</h1>;
}