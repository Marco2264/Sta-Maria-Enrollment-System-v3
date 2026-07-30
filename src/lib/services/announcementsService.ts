import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, QueryConstraint } from 'firebase/firestore';
import { db } from '../firebase';

export type AnnouncementCategory = 'Emergency' | 'Event' | 'Academic' | 'General' | 'Maintenance';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  category: AnnouncementCategory;
  isPinned: boolean;
  targetGrades: string[]; // e.g., ['Grade 1', 'Grade 2', 'All']
  targetSections: string[]; // e.g., ['Grade 1-Mabini', 'All']
  authorId: string;
  createdAt: unknown;
  updatedAt?: unknown;
}

export interface AnnouncementRead {
  id: string;
  announcementId: string;
  parentId: string;
  readAt: unknown;
}

const categoryColors: Record<AnnouncementCategory, string> = {
  'Emergency': 'bg-red-100 text-red-800 border-red-300',
  'Event': 'bg-green-100 text-green-800 border-green-300',
  'Academic': 'bg-blue-100 text-blue-800 border-blue-300',
  'General': 'bg-slate-100 text-slate-800 border-slate-300',
  'Maintenance': 'bg-yellow-100 text-yellow-800 border-yellow-300'
};

export const getCategoryColor = (category: AnnouncementCategory): string => {
  return categoryColors[category] || categoryColors['General'];
};

/**
 * Subscribe to announcements filtered by parent's children grades and sections
 */
export function subscribeParentAnnouncements(
  childGrades: string[],
  childSections: string[],
  parentId: string,
  onData: (announcements: Announcement[], readStates: Map<string, boolean>) => void,
  onError?: (error: Error) => void
) {
  try {
    const unsubscribers: Array<() => void> = [];

    // Query all announcements (no filter needed, we'll filter client-side)
    const q = query(collection(db, 'announcements'));

    const unsubAnnouncements = onSnapshot(
      q,
      (snap) => {
        try {
          const allAnnouncements = snap.docs.map((d) => ({ 
            id: d.id, 
            ...d.data() 
          })) as Announcement[];

          // Filter announcements that match parent's children grades/sections
          const filteredAnnouncements = allAnnouncements
            .filter(a => {
              const matchesGrade = !a.targetGrades || a.targetGrades.length === 0 || 
                a.targetGrades.includes('All') || 
                a.targetGrades.some(g => childGrades.includes(g));
              
              const matchesSection = !a.targetSections || a.targetSections.length === 0 ||
                a.targetSections.includes('All') ||
                a.targetSections.some(s => childSections.includes(s));
              
              return matchesGrade || matchesSection;
            })
            .sort((a, b) => {
              // Pinned first, then by date (newest first)
              if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
              const aTime = (a.createdAt as any)?.seconds ?? (a.createdAt as any)?.getTime?.() ?? 0;
              const bTime = (b.createdAt as any)?.seconds ?? (b.createdAt as any)?.getTime?.() ?? 0;
              return bTime - aTime;
            });

          // Query read states for this parent
          const readQ = query(
            collection(db, 'announcementReads'),
            where('parentId', '==', parentId)
          );

          const unsubReads = onSnapshot(
            readQ,
            (readSnap) => {
              try {
                const readMap = new Map<string, boolean>();
                readSnap.docs.forEach(d => {
                  const data = d.data();
                  readMap.set(data.announcementId, true);
                });
                onData(filteredAnnouncements, readMap);
              } catch (err) {
                console.error('Error processing read states:', err);
                onData(filteredAnnouncements, new Map());
              }
            },
            (err) => {
              console.error('Error fetching read states:', err);
              if (onError) onError(err instanceof Error ? err : new Error(String(err)));
            }
          );

          unsubscribers.push(unsubReads);
        } catch (err) {
          console.error('Error processing announcements:', err);
          if (onError) onError(err instanceof Error ? err : new Error(String(err)));
        }
      },
      (err) => {
        console.error('Error fetching announcements:', err);
        if (onError) onError(err instanceof Error ? err : new Error(String(err)));
      }
    );

    unsubscribers.push(unsubAnnouncements);

    // Return function that unsubscribes from all listeners
    return () => {
      unsubscribers.forEach(unsub => {
        try {
          unsub();
        } catch (err) {
          console.error('Error unsubscribing:', err);
        }
      });
    };
  } catch (error) {
    console.error('Error in subscribeParentAnnouncements:', error);
    if (onError) onError(error instanceof Error ? error : new Error(String(error)));
    return () => {};
  }
}
  }
}

/**
 * Mark an announcement as read
 */
export async function markAnnouncementAsRead(
  announcementId: string,
  parentId: string
): Promise<void> {
  try {
    // Check if already exists
    const q = query(
      collection(db, 'announcementReads'),
      where('announcementId', '==', announcementId),
      where('parentId', '==', parentId)
    );

    const snap = await new Promise<any>((resolve) => {
      onSnapshot(q, (s) => resolve(s), resolve);
    });

    if (snap.docs.length === 0) {
      await addDoc(collection(db, 'announcementReads'), {
        announcementId,
        parentId,
        readAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Error marking announcement as read:', error);
  }
}
