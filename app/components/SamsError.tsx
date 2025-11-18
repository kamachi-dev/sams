"use client";
import * as React from "react";
import { Cross2Icon, ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { Toast } from "radix-ui"; // keeping existing import style

// Internal handler & queue so AppendError can be called before component mounts.
let appendErrorHandler: ((description: string) => void) | null = null;
const pendingErrors: string[] = [];
let nextErrorId = 1;

export function Error(description: string) {
    console.error(description);
    if (appendErrorHandler) appendErrorHandler(description);
    else pendingErrors.push(description);
}

type ErrorToastProps = {
    description: string;
    onClose: () => void;
};

function ErrorToast({ description, onClose }: ErrorToastProps) {
    const [open, setOpen] = React.useState(true);
    const timerRef = React.useRef<number>(0);

    React.useEffect(() => {
        if (!open) onClose();
        return () => window.clearTimeout(timerRef.current);
    }, [open, onClose]);

    return (
        <Toast.Root
            className="sams-error-toast"
            open={open}
            onOpenChange={setOpen}
            duration={2000}
            onMouseEnter={() => window.clearTimeout(timerRef.current)}
            onMouseLeave={() => {
                timerRef.current = window.setTimeout(() => {
                    setOpen(false);
                }, 2000);
            }}
        >
            <Toast.Title className="sams-error-toast-title">
                <ExclamationTriangleIcon width={20} height={20} />
                An error occurred
            </Toast.Title>
            <Toast.Description className="sams-error-toast-description">
                {description}
            </Toast.Description>
            <Toast.Action className="sams-error-toast-close-button" altText="Close" asChild>
                <button type="button" onClick={() => setOpen(false)}>
                    <Cross2Icon />
                </button>
            </Toast.Action>
        </Toast.Root>
    );
}

export default function SamsError() {
    const [errors, setErrors] = React.useState<Array<{ id: number; description: string }>>([]);

    React.useEffect(() => {
        appendErrorHandler = (description: string) => {
            setErrors(prev => [...prev, { id: nextErrorId++, description }]);
        };
        // Flush any queued errors that happened pre-mount.
        if (pendingErrors.length) {
            pendingErrors.splice(0).forEach(d => appendErrorHandler && appendErrorHandler(d));
        }
        return () => {
            appendErrorHandler = null;
        };
    }, []);

    return (
        <>
            <div className="sams-error">
                {errors.map(err => (
                    <ErrorToast
                        key={err.id}
                        description={err.description}
                        onClose={() => setErrors(prev => prev.filter(e => e.id !== err.id))}
                    />
                ))}
            </div>
            <Toast.Viewport className="sams-error-toast-viewport" />
        </>
    );
}