import NextAuth, { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import supabase from "@/app/services/supa";

export const authOptions: NextAuthOptions = {
    debug: process.env.NODE_ENV === "development",
    providers: [
        GitHubProvider({
            clientId: process.env.GITHUB_ID!,
            clientSecret: process.env.GITHUB_SECRET!,
        }),
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
    ],
    callbacks: {
        async signIn({ user }) {
            const { data, error } = await supabase
                .from("user")
                .select("*")
                .eq("email", user.email)
                .single();

            if (error || !data) return false;

            user.role = data.role;
            return true;
        },
        async redirect({ baseUrl }) {
            return `${baseUrl}/redirect`;
        },
        async jwt({ token, user }) {
            if (user?.role) token.role = user.role;
            return token;
        },
        async session({ session, token }) {
            if (session?.user && token?.role) {
                session.user.role = token.role;
            }
            return session;
        },
    },
    secret:
        process.env.NEXTAUTH_SECRET ||
        "TGyvmdi0F5Zbf66n7j/oOnA2JchCT8xgkeHbpKfhSEE=",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };