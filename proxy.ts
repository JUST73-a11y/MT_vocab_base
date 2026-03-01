import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
    const token = request.cookies.get('token')?.value;
    const { pathname } = request.nextUrl;

    // Public paths that don't require authentication
    const publicPaths = [
        '/login',
        '/register',
        '/',
    ];

    const isPublicPath = publicPaths.some(path => pathname === path);
    const isApiAuth = pathname.startsWith('/api/auth');
    const isNextInternal = pathname.startsWith('/_next');
    const isStatic = pathname.startsWith('/static');
    const isFavicon = pathname === '/favicon.ico';

    // Allow public paths and Next.js internals
    if (isPublicPath || isApiAuth || isNextInternal || isStatic || isFavicon) {
        return NextResponse.next();
    }

    // Protect all other routes - redirect to login if no token
    if (!token) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key-change-me');
        // Using dynamic import for jose to avoid issues with edge runtime
        const { payload } = await import('jose').then(m => m.jwtVerify(token, secret));

        const role = payload.role as string;
        const teacherId = payload.teacherId as string;

        // Admin strict protection
        if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
            if (role !== 'admin') {
                if (pathname.startsWith('/api')) {
                    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
                }
                return NextResponse.redirect(new URL('/login', request.url));
            }
        }

        // Onboarding redirect logic for students
        if (role === 'student' && !teacherId && !pathname.includes('/onboarding') && !pathname.startsWith('/api')) {
            return NextResponse.redirect(new URL('/student/onboarding', request.url));
        }

        // If trying to access onboarding but already has teacher
        if (role === 'student' && teacherId && pathname.includes('/onboarding')) {
            return NextResponse.redirect(new URL('/student/dashboard', request.url));
        }

    } catch (e) {
        // If token invalid, clear it and redirect to login
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.delete('token');
        return response;
    }

    // If token exists, allow access (role verification happens in API routes)
    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except static files
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
