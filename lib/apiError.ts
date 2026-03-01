import { NextResponse } from 'next/server';

export type ApiErrorCode =
    | 'UNAUTHORIZED'
    | 'FORBIDDEN'
    | 'NOT_FOUND'
    | 'TEACHER_NOT_FOUND'
    | 'USER_NOT_FOUND'
    | 'BAD_REQUEST'
    | 'VALIDATION_ERROR'
    | 'CONFLICT'
    | 'SERVER_ERROR';

export interface ApiErrorResponse {
    code: ApiErrorCode;
    message: string;
    details?: any;
    status: number;
}

export function createApiError(
    code: ApiErrorCode,
    message: string,
    status: number,
    details?: any
) {
    return NextResponse.json(
        { code, message, details },
        { status }
    );
}
