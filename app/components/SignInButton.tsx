'use client';
import Image from 'next/image';
import { signIn } from "next-auth/react"

export default function SignInButton() {
    return (
        <button className="form-signin" onClick={() => {
            signIn("google");
        }}>
            <div className="form-signin-icon" style={{ width: 24, height: 24 }}>
                <Image src="/icons/google.png" alt="Google icon" width={24} height={24} />
            </div>
            Sign in with Google
        </button>
    );
}