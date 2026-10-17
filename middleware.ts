import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
    "/",
    "/sign-in(.*)",
    "/sign-up(.*)",
    "/auth/(.*)",
]);

// Don't protect API routes in middleware - let them handle their own auth
const isApiRoute = createRouteMatcher([
    "/api/(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
    // Skip API routes - they handle their own authentication
    if (isApiRoute(req)) return;
    
    if (isPublicRoute(req)) return;
    
    await auth.protect();
});

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        "/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    ],
};
