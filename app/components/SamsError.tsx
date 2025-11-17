"use client";
import * as React from "react";
import { Cross2Icon, ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { Toast } from "radix-ui";

export interface SamsErrorRef {
    showError: (message?: string) => void;
}

const SamsError = React.forwardRef<SamsErrorRef>((props, ref) => {
    const [open, setOpen] = React.useState(false);
    const [description, setDescription] = React.useState("Something went wrong while processing your request. Please try again later.");
    const timerRef = React.useRef(0);

    const showError = React.useCallback((message?: string) => {
        if (message) setDescription(message);
        setOpen(false);
        window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => {
            setOpen(true);
        }, 100);
    }, []);

    React.useImperativeHandle(ref, () => ({
        showError
    }), [showError]);

    React.useEffect(() => {
        return () => clearTimeout(timerRef.current);
    }, []);

    return (
        <Toast.Provider swipeDirection="right">
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
                <Toast.Action className="sams-error-toast-close-button" altText="Close">
                    <Cross2Icon />
                </Toast.Action>
            </Toast.Root>
            <Toast.Viewport className="sams-error-toast-viewport" />
        </Toast.Provider>
    );
});

SamsError.displayName = "SamsError";

export default SamsError;