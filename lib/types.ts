export type UserRole = 'student' | 'teacher' | 'admin';

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    status: 'active' | 'blocked';
    totalWordsSeen: number;
    createdAt: Date;
    teacherCode?: string;
    teacherId?: string;
}

export interface Unit {
    id: string;
    title: string;
    category?: string;
    categoryId?: string;
    customTimer?: number;
    createdBy: string;
    createdAt: Date;
}

export interface Word {
    id: string;
    unitId: string;
    englishWord: string;
    uzbekTranslation: string;
    phonetic?: string;
    exampleSentence?: string;
    audioUrl?: string;
}

export interface Settings {
    id: string;
    teacherId: string;
    selectedUnits: string[];
    timerDuration: number;
}

export interface Session {
    id: string;
    studentId: string;
    wordsSeen: string[];
    date: string;
    wordsCount: number;
}
