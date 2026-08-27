import dbConnect from '@/lib/db';
import ClassroomScoreEvent, { IClassroomScoreEvent } from '@/models/ClassroomScoreEvent';
import GroupMember from '@/models/GroupMember';
import Group from '@/models/Group';
import User from '@/models/User';
import mongoose from 'mongoose';
import { EventEmitter } from 'events';

// Global Event Emitter for Real-Time SSE Streams
declare global {
    var classroomScoreEmitter: EventEmitter | undefined;
}

export const scoreEmitter: EventEmitter = global.classroomScoreEmitter || new EventEmitter();
scoreEmitter.setMaxListeners(200);
if (process.env.NODE_ENV !== 'production') {
    global.classroomScoreEmitter = scoreEmitter;
}

export interface AddScoreParams {
    studentId: string;
    groupId: string;
    teacherId: string;
    points: number;
    category?: 'homework' | 'vocab' | 'grammar' | 'participation' | 'behavior' | 'game' | 'quiz' | 'bonus' | 'penalty' | 'other';
    reason?: string;
    source?: string;
}

export interface UndoScoreParams {
    teacherId: string;
    groupId: string;
    eventId?: string;
}

/**
 * Central Single Source of Truth for adding classroom scores.
 */
export async function addClassroomScoreEvent(params: AddScoreParams) {
    await dbConnect();
    const { studentId, groupId, teacherId, points, category = 'other', reason = '', source = 'live_score' } = params;

    if (!studentId || !groupId || !teacherId) {
        throw new Error('studentId, groupId, and teacherId are required');
    }
    if (typeof points !== 'number' || isNaN(points) || points === 0) {
        throw new Error('Invalid points value');
    }

    // Robust student group membership check with auto-heal fallback
    const studentObjId = new mongoose.Types.ObjectId(studentId);
    const groupObjId = new mongoose.Types.ObjectId(groupId);

    let isMember = await GroupMember.findOne({
        groupId: groupObjId,
        studentId: studentObjId
    });

    if (!isMember) {
        // Fallback string match or auto-heal membership
        isMember = await GroupMember.findOne({
            groupId: groupId.toString(),
            studentId: studentId.toString()
        });

        if (!isMember) {
            // Auto-heal membership if student exists in User model
            const studentUser = await User.findById(studentObjId);
            if (studentUser) {
                await GroupMember.create({
                    groupId: groupObjId,
                    studentId: studentObjId,
                    joinedAt: new Date()
                });
            }
        }
    }

    // Create the score event
    const event = await ClassroomScoreEvent.create({
        studentId: studentObjId,
        groupId: groupObjId,
        teacherId: new mongoose.Types.ObjectId(teacherId),
        points,
        category,
        reason,
        source,
        isReversal: false,
        reversalOf: null,
        createdAt: new Date()
    });

    const populatedEvent = await ClassroomScoreEvent.findById(event._id)
        .populate('studentId', 'name email')
        .lean();

    // Broadcast real-time update
    scoreEmitter.emit(`group_${groupId}`, {
        type: 'SCORE_ADDED',
        event: populatedEvent,
        timestamp: Date.now()
    });

    return populatedEvent;
}

/**
 * Central Reversal / Undo Engine
 */
export async function undoClassroomScoreEvent(params: UndoScoreParams) {
    await dbConnect();
    const { teacherId, groupId, eventId } = params;

    let targetEvent;
    if (eventId) {
        targetEvent = await ClassroomScoreEvent.findOne({
            _id: new mongoose.Types.ObjectId(eventId),
            groupId: new mongoose.Types.ObjectId(groupId),
            teacherId: new mongoose.Types.ObjectId(teacherId),
            isReversal: false
        });
    } else {
        targetEvent = await ClassroomScoreEvent.findOne({
            groupId: new mongoose.Types.ObjectId(groupId),
            teacherId: new mongoose.Types.ObjectId(teacherId),
            isReversal: false
        }).sort({ createdAt: -1 });
    }

    if (!targetEvent) {
        throw new Error('No reversible score event found');
    }

    const alreadyReversed = await ClassroomScoreEvent.findOne({
        reversalOf: targetEvent._id
    });
    if (alreadyReversed) {
        throw new Error('This event has already been reversed');
    }

    const reversalEvent = await ClassroomScoreEvent.create({
        studentId: targetEvent.studentId,
        groupId: targetEvent.groupId,
        teacherId: new mongoose.Types.ObjectId(teacherId),
        points: -targetEvent.points,
        category: targetEvent.category,
        reason: `Bekor qilindi (Undo of event ${targetEvent._id})`,
        source: 'reversal',
        isReversal: true,
        reversalOf: targetEvent._id,
        createdAt: new Date()
    });

    const populatedReversal = await ClassroomScoreEvent.findById(reversalEvent._id)
        .populate('studentId', 'name email')
        .lean();

    scoreEmitter.emit(`group_${groupId}`, {
        type: 'SCORE_REVERSED',
        originalEventId: targetEvent._id.toString(),
        reversalEvent: populatedReversal,
        timestamp: Date.now()
    });

    return {
        originalEventId: targetEvent._id.toString(),
        reversalEvent: populatedReversal
    };
}

/**
 * Computes date boundaries for today, this week (Mon-Sun), and this month.
 */
export function getDateBoundaries() {
    const now = new Date();
    
    // Start of Today (local 00:00:00)
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    
    // Start of Week (Monday 00:00:00)
    const day = now.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff, 0, 0, 0, 0);

    // Start of Month (1st 00:00:00)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    return { startOfToday, startOfWeek, startOfMonth };
}