import { DefaultSession, DefaultUser } from "next-auth"

declare module "next-auth" {
    interface User extends DefaultUser {
        role?: number
    }

    interface Session {
        user: {
            role?: number
        } & DefaultSession["user"]
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        role?: number
    }
}