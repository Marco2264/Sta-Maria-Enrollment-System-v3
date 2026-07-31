import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, query, where, orderBy, onSnapshot } from 'firebase/firestore';

export interface ActivityLog {
  id: string;
  parentId: string;
  title: string;
  subtitle: string;
  type: 'document' | 'registration' | 'profile' | 'attendance' | 'announcement' | 'delete';
  badgeText: string;
  badgeColor: string;
  dotColor: string;
  timestamp: number;
  createdAt?: any;
}

/**
 * Logs a new user action to Firestore activity_logs collection.
 */
export async function logActivity(params: {
  parentId: string;
  title: string;
  subtitle: string;
  type: 'document' | 'registration' | 'profile' | 'attendance' | 'announcement' | 'delete';
  badgeText?: string;
  badgeColor?: string;
  dotColor?: string;
}): Promise<void> {
  if (!params.parentId) return;

  try {
    const badgeText = params.badgeText || 'UPDATED';
    const badgeColor = params.badgeColor || 'bg-blue-50 text-[#2563eb] border-blue-200';
    const dotColor = params.dotColor || 'bg-[#2563eb]';

    await addDoc(collection(db, 'activity_logs'), {
      parentId: params.parentId,
      title: params.title,
      subtitle: params.subtitle,
      type: params.type,
      badgeText,
      badgeColor,
      dotColor,
      timestamp: Date.now(),
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.warn('[activityLogService] Failed to log activity:', err);
  }
}

/**
 * Subscribes to real-time activity logs for a parent user.
 */
export function subscribeParentActivityLogs(
  parentId: string,
  onUpdate: (logs: ActivityLog[]) => void
): () => void {
  if (!parentId) {
    onUpdate([]);
    return () => {};
  }

  try {
    console.log("Collection:", "activity_logs");
    console.log("Doc ID:", "N/A");
    console.log("Query params:", { parentId });
    const q = query(
      collection(db, 'activity_logs'),
      where('parentId', '==', parentId)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const list: ActivityLog[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          let ts = data.timestamp || Date.now();
          if (data.createdAt?.toDate) {
            ts = data.createdAt.toDate().getTime();
          } else if (typeof data.createdAt === 'number') {
            ts = data.createdAt;
          }

          return {
            id: docSnap.id,
            parentId: data.parentId,
            title: data.title || 'System Action',
            subtitle: data.subtitle || '',
            type: data.type || 'profile',
            badgeText: data.badgeText || 'ACTIVITY',
            badgeColor: data.badgeColor || 'bg-blue-50 text-[#2563eb] border-blue-200',
            dotColor: data.dotColor || 'bg-[#2563eb]',
            timestamp: ts
          };
        });

        onUpdate(list);
      },
      (err) => {
        console.warn('[activityLogService] Error subscribing to activity logs:', err);
        onUpdate([]);
      }
    );
  } catch (err) {
    console.warn('[activityLogService] Failed to initialize subscription:', err);
    onUpdate([]);
    return () => {};
  }
}
