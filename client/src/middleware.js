import { NextResponse } from 'next/server';

const STAGE_ROUTES = {
  MCQ: '/exam-player',
  RESUME_UPLOAD: '/student/resume',
  APTITUDE: '/student/aptitude',
  CODING: '/student/coding',
  HR_INTERVIEW: '/student/interview',
  FINISHED: '/student/dashboard',
};

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Only protect student assessment routes
  const protectedRoutes = Object.values(STAGE_ROUTES);
  
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    try {
      // Decode JWT without full verification for speed in middleware if possible, 
      // or use jose for full verification if secret is available
      const base64Payload = token.split('.')[1];
      const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());
      const currentStage = payload.currentStage || 'MCQ';
      
      const sanctionedRoute = STAGE_ROUTES[currentStage];
      
      // Redirect if user tries to access a stage they haven't reached yet or has passed
      if (pathname !== sanctionedRoute && !pathname.includes('dashboard')) {
        return NextResponse.redirect(new URL(sanctionedRoute, request.url));
      }
    } catch (err) {
      console.error('Middleware JWT Error:', err);
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/student/:path*'],
};
