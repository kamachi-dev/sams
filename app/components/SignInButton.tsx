'use client';
import Image from 'next/image';

export default function SignInButton() {
    return (
        <button className="form-signin" onClick={() => {
            window.location.href = "/admin-portal";
        }}>
            <div className="form-signin-icon" style={{ width: 24, height: 24 }}>
                <Image src="/icons/google.png" alt="Google icon" width={24} height={24} />
            </div>
            Sign in with Google
        </button>
    );
}