import NextAuth, { type DefaultSession } from "next-auth"
import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { db } from "@/lib/db"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: "USER" | "ADMIN"
    } & DefaultSession["user"]
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  providers: [
    GitHub,
    Google,
    Credentials({
      name: "Development Bypass",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        const emailStr = credentials.email as string

        const user = await db.user.findUnique({
          where: { email: emailStr }
        });

        if (user) {
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            role: user.role
          };
        }
        return null;
      }
    })
  ],
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (token.email) {
        const dbUser = await db.user.findUnique({
          where: { email: token.email }
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.name = dbUser.name;
          token.picture = dbUser.image;
          token.role = dbUser.role || "USER";
        }
      } else if (user) {
        token.id = user.id;
        token.name = user.name;
        token.picture = user.image;
        token.role = (user as any).role || "USER";
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string;
        session.user.role = (token.role as "USER" | "ADMIN") || "USER";
      }
      return session;
    },
  },
})
