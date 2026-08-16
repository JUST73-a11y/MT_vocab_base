import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Define protected route prefixes
const STUDENT_ROUTES = '/student';
const TEACHER_ROUTES = '/teacher';
const ADMIN_ROUTES = '/admin';

const API_STUDENT_ROUTES = '/api/student';
const API_TEACHER_ROUTES = '/api/teacher';
const API_ADMIN_ROUTES = '/api/admin';

export default async function proxy(req: NextRequest) {
    const path = req.nextUrl.pathname;

    // Fast-path: Skip middleware for public routes and static assets
    if (
        path.startsWith('/_next') ||
        path.startsWith('/favicon.ico') ||
        path.startsWith('/images') ||
        path.startsWith('/api/auth') ||
        path === '/login' ||
        path === '/register' ||
        path === '/' ||
        path.match(/\.(png|jpe?g|svg|webp|ico|css|js)$/)
    ) {
        return NextResponse.next();
    }

    // Determine if the current path requires protection
    const isApiRoute = path.startsWith('/api') && !path.startsWith('/api/auth');
    const isStudentRoute = path.startsWith(STUDENT_ROUTES) || path.startsWith(API_STUDENT_ROUTES);
    const isTeacherRoute = path.startsWith(TEACHER_ROUTES) || path.startsWith(API_TEACHER_ROUTES);
    const isAdminRoute = path.startsWith(ADMIN_ROUTES) || path.startsWith(API_ADMIN_ROUTES);

    const requiresAuth = isApiRoute || isStudentRoute || isTeacherRoute || isAdminRoute;

    // If it's not a route that requires authentication, let it pass
    if (!requiresAuth) {
        return NextResponse.next();
    }

    // Attempt to get the token from cookies
    const token = req.cookies.get('token')?.value;

    // If no token exists, redirect to login (or return 401 for API)
    if (!token) {
        if (path.startsWith('/api')) {
            return NextResponse.json({ message: 'Unauthorized. No token provided.' }, { status: 401 });
        }
        return NextResponse.redirect(new URL('/login', req.url));
    }

    try {
        // Verify the JWT using jose
        const secret = new TextEncoder().encode(
            process.env.JWT_SECRET || 'default-secret-key-change-me'
        );
        const { payload } = await jwtVerify(token, secret);
        
        const role = payload.role as string;

        // Role-Based Access Control Checks
        
        // 1. Admin Routes: Only 'admin' role allowed
        if (isAdminRoute && role !== 'admin') {
            if (path.startsWith('/api')) {
                return NextResponse.json({ message: 'Forbidden: Admin access required.' }, { status: 403 });
            }
            // Redirect unauthorized users based on their actual role
            return NextResponse.redirect(new URL(role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard', req.url));
        }

        // 2. Teacher Routes: 'teacher' and 'admin' allowed (except shared category tree which supports students)
        const isTeacherCategoryTree = path === '/api/teacher/categories/tree';
        if (isTeacherRoute && !isTeacherCategoryTree && role !== 'teacher' && role !== 'admin') {
            if (path.startsWith('/api')) {
                return NextResponse.json({ message: 'Forbidden: Teacher access required.' }, { status: 403 });
            }
            return NextResponse.redirect(new URL('/student/dashboard', req.url));
        }

        // 3. Student Routes: 'student' allowed (Admin/Teacher shouldn't use student UI normally, redirect them)
        if (isStudentRoute && role !== 'student') {
            // Give API access to teachers/admins if they are fetching student data, but UI access should be blocked
            if (!path.startsWith('/api')) {
                return NextResponse.redirect(new URL(role === 'admin' ? '/admin/dashboard' : '/teacher/dashboard', req.url));
            }
        }

        // 4. Student Onboarding Logic
        const teacherId = payload.teacherId as string;
        if (role === 'student' && !teacherId && !path.includes('/onboarding') && !path.startsWith('/api')) {
            return NextResponse.redirect(new URL('/student/onboarding', req.url));
        }
        if (role === 'student' && teacherId && path.includes('/onboarding')) {
            return NextResponse.redirect(new URL('/student/dashboard', req.url));
        }

        // Pass payload securely to downstream API routes via headers
        const requestHeaders = new Headers(req.headers);
        requestHeaders.set('x-user-id', String(payload.id));
        requestHeaders.set('x-user-role', String(payload.role));
        if (payload.teacherId) requestHeaders.set('x-user-teacher-id', String(payload.teacherId));

        return NextResponse.next({
            request: {
                headers: requestHeaders,
            },
        });

    } catch (error) {
        console.error('Middleware JWT Error:', error);
        // Invalid or expired token
        if (path.startsWith('/api')) {
            return NextResponse.json({ message: 'Unauthorized. Invalid or expired token.' }, { status: 401 });
        }
        // Redirect to login and clear the bad cookie
        const response = NextResponse.redirect(new URL('/login', req.url));
        response.cookies.delete('token');
        return response;
    }
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files
         */
        '/((?!_next/static|_next/image|favicon.ico|public/).*)',
    ],
};
