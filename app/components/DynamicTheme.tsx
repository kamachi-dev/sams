'use client';

import { Switch } from "radix-ui";

export default function DynamicTheme() {

    function toggleTheme(checked: boolean) {
        document.documentElement.classList.toggle('dark', checked);
    }

    return (
        <Switch.Root className="sams-nav-settings-switch" onCheckedChange={(checked) => toggleTheme(checked)}>
            <Switch.Thumb className="sams-nav-settings-switch-thumb" />
        </Switch.Root>
    );
}