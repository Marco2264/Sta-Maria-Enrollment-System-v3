import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  serverTimestamp,
  orderBy,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';

export interface AnnouncementNotification {
  id: string;
  title: string;
  content: string;
  category: 'Emergency' | 'Class Suspension' | 'General' | 'Academic' | 'Events' | 'Event' | 'Maintenance';
  author: string;
  authorRole?: string;
  targetType?: string;
  targetGradeLevel?: string;
  targetSectionId?: string;
  isPinned?: boolean;
  createdAt: any;
  date?: string;
  time?: string;
  attachmentName?: string;
  attachmentUrl?: string;
  attachmentType?: 'image' | 'pdf' | 'doc';
  isRead: boolean;
  timeAgo: string;
}

// Local cache helper for immediate zero-latency feedback
function getLocalReadMap(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(`read_announcements_${userId}`);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveLocalRead(userId: string, announcementId: string) {
  try {
    const set = getLocalReadMap(userId);
    set.add(announcementId);
    localStorage.setItem(`read_announcements_${userId}`, JSON.stringify(Array.from(set)));
  } catch (err) {
    console.warn('Failed to cache local read state:', err);
  }
}

function formatRelativeTime(timestamp: any, dateStr?: string): string {
  try {
    let dateObj: Date | null = null;

    if (timestamp) {
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        dateObj = timestamp.toDate();
      } else if (timestamp instanceof Date) {
        dateObj = timestamp;
      } else if (typeof timestamp === 'number') {
        dateObj = new Date(timestamp);
      } else if (typeof timestamp === 'string') {
        dateObj = new Date(timestamp);
      }
    }

    if ((!dateObj || isNaN(dateObj.getTime())) && dateStr) {
      dateObj = new Date(dateStr);
    }

    if (!dateObj || isNaN(dateObj.getTime())) {
      return 'Recently';
    }

    const now = Date.now();
    const diffMs = now - dateObj.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

/**
 * Filter announcements based on user role
 */
export function filterAnnouncementsByRole(
  announcements: any[],
  role: string,
  userGrades?: string[],
  userSections?: string[]
): any[] {
  const normRole = (role || '').toLowerCase();

  return announcements.filter((item) => {
    if (item.isArchived) return false;

    const targetType = (item.targetType || 'all').toLowerCase();

    // 1. Admin receives all announcements
    if (normRole === 'admin' || normRole === 'subadmin') {
      return true;
    }

    // 2. Teacher receives: 'all', 'all_teachers', grade/section relevant, or general school
    if (normRole === 'teacher') {
      if (targetType === 'all' || targetType === 'all_teachers') return true;
      if (targetType === 'student') return false; // purely direct student
      if (item.tab === 'school') return true;
      if (userGrades && item.targetGradeLevel && userGrades.includes(item.targetGradeLevel)) return true;
      if (userSections && item.targetSectionId && userSections.includes(item.targetSectionId)) return true;
      return targetType !== 'specific_parent';
    }

    // 3. Parent receives: 'all', grade/section of their children, or general school (NOT teacher-only)
    if (normRole === 'parent' || normRole === 'guardian') {
      if (targetType === 'all_teachers' || targetType === 'specific_teacher') return false;
      if (targetType === 'all') return true;
      if (item.tab === 'school') return true;
      if (userGrades && item.targetGradeLevel && userGrades.includes(item.targetGradeLevel)) return true;
      if (userSections && item.targetSectionId && userSections.includes(item.targetSectionId)) return true;
      if (item.targetGrades && Array.isArray(item.targetGrades)) {
        if (item.targetGrades.includes('All')) return true;
        if (userGrades && item.targetGrades.some((g: string) => userGrades.includes(g))) return true;
      }
      return true;
    }

    // Default fallback
    return targetType === 'all';
  });
}

/**
 * Subscribe to real-time announcements notifications with per-user read/unread state
 */
export function subscribeUserNotifications(
  userId: string,
  userRole: string,
  onData: (notifications: AnnouncementNotification[], unreadCount: number) => void,
  userGrades?: string[],
  userSections?: string[]
): () => void {
  if (!userId) {
    onData([], 0);
    return () => {};
  }

  let unsubAnnouncements: (() => void) | null = null;
  let unsubReads: (() => void) | null = null;

  let rawAnnouncements: any[] = [];
  let serverReadIds = new Set<string>();

  const localReads = getLocalReadMap(userId);

  const recompute = () => {
    const relevant = filterAnnouncementsByRole(rawAnnouncements, userRole, userGrades, userSections);

    const notifications: AnnouncementNotification[] = relevant.map((item) => {
      const isRead = serverReadIds.has(item.id) || localReads.has(item.id);
      return {
        id: item.id,
        title: item.title || 'Announcement',
        content: item.content || '',
        category: item.category || 'General',
        author: item.author || 'Administration',
        authorRole: item.authorRole,
        targetType: item.targetType,
        targetGradeLevel: item.targetGradeLevel,
        targetSectionId: item.targetSectionId,
        isPinned: !!item.isPinned,
        createdAt: item.createdAt,
        date: item.date,
        time: item.time,
        attachmentName: item.attachmentName,
        attachmentUrl: item.attachmentUrl,
        attachmentType: item.attachmentType,
        isRead,
        timeAgo: formatRelativeTime(item.createdAt, item.date)
      };
    });

    const unreadCount = notifications.filter((n) => !n.isRead).length;
    onData(notifications, unreadCount);
  };

  try {
    // 1. Listen to Announcements
    const announcementsQuery = query(collection(db, 'announcements'));
    unsubAnnouncements = onSnapshot(
      announcementsQuery,
      (snapshot) => {
        rawAnnouncements = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        })).sort((a: any, b: any) => {
          if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
          const aTime = a.createdAt?.seconds || (a.createdAt instanceof Date ? a.createdAt.getTime() : 0);
          const bTime = b.createdAt?.seconds || (b.createdAt instanceof Date ? b.createdAt.getTime() : 0);
          return bTime - aTime;
        });

        recompute();
      },
      (err) => {
        console.warn('Notification announcements snapshot error:', err);
      }
    );

    // 2. Listen to user reads from announcementReads collection
    const readsQuery = query(
      collection(db, 'announcementReads'),
      where('userId', '==', userId)
    );

    unsubReads = onSnapshot(
      readsQuery,
      (snapshot) => {
        serverReadIds = new Set(snapshot.docs.map((d) => d.data().announcementId));
        recompute();
      },
      (err) => {
        console.warn('Notification reads snapshot error:', err);
        recompute();
      }
    );
  } catch (error) {
    console.error('Error setting up notification subscriptions:', error);
  }

  return () => {
    if (unsubAnnouncements) unsubAnnouncements();
    if (unsubReads) unsubReads();
  };
}

/**
 * Mark a single announcement as read for a specific user
 */
export async function markAnnouncementAsRead(
  announcementId: string,
  userId: string
): Promise<void> {
  if (!announcementId || !userId) return;

  // Immediate local state update
  saveLocalRead(userId, announcementId);

  try {
    const docId = `${userId}_${announcementId}`;
    const readDocRef = doc(db, 'announcementReads', docId);
    await setDoc(
      readDocRef,
      {
        userId,
        parentId: userId, // compatibility with legacy parent query
        announcementId,
        readAt: serverTimestamp()
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Error marking announcement as read:', error);
  }
}

/**
 * Mark all given announcements as read for a specific user
 */
export async function markAllAnnouncementsAsRead(
  announcementIds: string[],
  userId: string
): Promise<void> {
  if (!userId || !announcementIds || announcementIds.length === 0) return;

  // Immediate local state update
  announcementIds.forEach((id) => saveLocalRead(userId, id));

  try {
    const batch = writeBatch(db);
    announcementIds.forEach((id) => {
      const docId = `${userId}_${id}`;
      const readDocRef = doc(db, 'announcementReads', docId);
      batch.set(
        readDocRef,
        {
          userId,
          parentId: userId,
          announcementId: id,
          readAt: serverTimestamp()
        },
        { merge: true }
      );
    });

    await batch.commit();
  } catch (error) {
    console.error('Error marking all announcements as read:', error);
  }
}
