"use client";

import Image from "next/image";
import "@/app/(pages)/(login)/index.css";
import { Dialog } from "radix-ui";
import { Cross2Icon } from "@radix-ui/react-icons";
import CarouselClient from "@/app/components/CarouselClient";
import { useAuth, useClerk, useUser } from "@clerk/nextjs";
import { useEffect, useRef, useState, useCallback } from "react";
import { Error } from "@/app/components/SamsError";
import { useRouter } from "next/navigation";

export default function Login() {
    const { signOut, openSignIn } = useClerk();
    const { isSignedIn } = useAuth();
    const { user } = useUser();
    const router = useRouter();
    const isSigningIn = useRef(false);
    const [isLoading, setIsLoading] = useState(false);

    const directLogIn = useCallback(() => {
        if (isLoading) return;
        isSigningIn.current = false;
        setIsLoading(true);
        fetch('/api/auth/callback')
            .then(res => res.json())
            .then(res => {
                if (res.success) router.replace(res.data.path);
                else {
                    Error(`${res.error}`);
                    console.error(res.data?.message ?? "Unknown error during login");
                    setIsLoading(false);
                }
            });
    }, [isLoading, router]);

    async function logIn() {
        isSigningIn.current = true;
        if (isSignedIn) await signOut();
        openSignIn({ oauthFlow: "popup" });
    }

    useEffect(() => {
        if (isSigningIn.current && isSignedIn && !isLoading) queueMicrotask(() => directLogIn());
    }, [isSignedIn, isLoading, directLogIn]);
    return (
        <>
            <CarouselClient />
            <div className="form">
                <div className="form-logo">
                    <Image src="/images/mmcl-logo.png" alt="" fill />
                </div>
                <h1 className="form-welcome a">Welcome to</h1>
                <h1 className="form-welcome b">Student Attendance Management System SAMS</h1>

                {!isLoading ? (
                    <div className="form-signin-list">
                        <button onClick={directLogIn}>
                            {isSignedIn && <div className="form-signin">
                                <div className="form-signin-icon" style={{ width: 24, height: 24 }}>
                                    <Image src={user?.imageUrl ?? "/icons/google.png"} alt="User avatar" width={24} height={24} />
                                </div>
                                Continue as {user?.fullName}
                            </div>}
                        </button>
                        <button onClick={logIn}>
                            <div className="form-signin">
                                <div className="form-signin-icon" style={{ width: 24, height: 24 }}>
                                    <Image src="/icons/google.png" alt="Google icon" width={24} height={24} />
                                </div>
                                Sign in with Google
                            </div>
                        </button>
                    </div>
                ) : (
                    <div className="form-signin-loading">Please wait as we sign you in...</div>
                )}

                <Dialog.Root>
                    <Dialog.Trigger className="form-terms-button">Terms and Conditions</Dialog.Trigger>
                    <Dialog.Portal>
                        <Dialog.Overlay className="form-terms-overlay" />
                        <Dialog.Content className="form-terms-content">
                            <Dialog.Title className="form-terms-title">Terms and Conditions</Dialog.Title>
                            <Dialog.Description className="form-terms-description">
                                By using SAMS, you agree to comply with the following terms and conditions:
                            </Dialog.Description>
                            <p>
                                <b>1. Introduction</b><br />
                                Welcome to SAMS (Student Attendance Management System). By using our services, you agree to comply with
                                and be bound by these Terms and Conditions. Please read them carefully before proceeding.<br />
                                <br />
                                <b>2. User Information</b><br />
                                To access attendance records via recorded videos in classes, users must provide their name and email
                                address. By providing this information, you consent to its collection, storage, and use for attendance
                                tracking purposes.<br />
                                <br />
                                <b>3. Purpose of Data Collection</b><br />
                                The Application records class sessions and uses video analysis to track attendance. Your personal
                                information (name and email) is used solely for:<br />
                            </p>
                            <ul className="form-terms-list">
                                <li>Identifying attendance records</li>
                                <li>Providing access to attendance logs</li>
                                <li>Ensuring accurate class participation tracking</li>
                            </ul><br />
                            <p>
                                <b>4. Data Protection</b><br />
                                We prioritize the security of your personal data. Your information will not be shared, sold, or used for
                                purposes other than attendance tracking. Data will be stored securely and retained only for as long as
                                necessary.<br />
                                <br />
                                <b>5. User Responsibilities</b><br />
                                By using the Application, you agree to:<br />
                                Provide accurate information<br />
                                Not misuse or tamper with the recording system<br />
                                Abide by class policies regarding attendance tracking<br />
                                <br />
                                <b>6. Video Recording Consent</b><br />
                                By using the Application, you acknowledge and agree that class sessions may be recorded for attendance
                                verification. These recordings will not be shared outside the intended purpose without explicit
                                consent.<br />
                                <br />
                                <b>7. Changes to Terms</b><br />
                                We reserve the right to update or modify these Terms at any time. Continued use of the Application
                                constitutes acceptance of any revisions.<br />
                                <br />
                                <b>8. Contact Information</b><br />
                                For questions or concerns regarding these Terms, please contact us at samssupport@mail.com.v
                                By using SAMS, you agree to these Terms and Conditions.<br />
                            </p>
                            <Dialog.Close className="form-terms-close">
                                <Cross2Icon width={20} height={20} />
                            </Dialog.Close>
                        </Dialog.Content>
                    </Dialog.Portal>
                </Dialog.Root>
            </div >

            <h1 className="motto">EXCELLENCE AND VIRTUE</h1>
        </>
    );
}
