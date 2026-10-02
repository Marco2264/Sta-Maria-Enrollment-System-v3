import React, { useState, useEffect } from 'react';
import { Bell, Pin, X } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../lib/AuthContext';
import { useParentData } from '../../lib/parentData';
import { subscribeParentAnnouncements, markAnnouncementAsRead, Announcement, getCategoryColor } from '../../lib/services/announcementsService';

export function AnnouncementsFeedView() {
  const { user } = useAuth();
  const { children } = useParentData();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [readStates, setReadStates] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    if (children.length === 0) {
      setLoading(false);
      return;
    }

    const childGrades = Array.from(new Set(children.map(c => c.gradeLevel).filter(Boolean)));
    const childSections = Array.from(new Set(
      children
        .map(c => c.sectionId ? `${c.gradeLevel}-${c.sectionId}` : `${c.gradeLevel}`)
        .filter(Boolean)
    ));

    const unsubscribe = subscribeParentAnnouncements(
      childGrades,
      childSections,
      user.uid,
      (announcements, readMap) => {
        setAnnouncements(announcements);
        setReadStates(readMap);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching announcements:', error);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user, children]);

  const handleAnnouncementClick = async (announcementId: string) => {
    setExpandedId(expandedId === announcementId ? null : announcementId);
    if (!readStates.has(announcementId)) {
      await markAnnouncementAsRead(announcementId, user!.uid);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#F4F7F9]">
      <header className="px-6 py-6 lg:py-0 lg:h-28 border-b border-slate-100 bg-white flex items-center shrink-0">
        <div className="max-w-4xl mx-auto w-full space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Bell className="w-5 h-5 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Announcements</h1>
          </div>
          <p className="text-sm text-slate-600 ml-11">
            Stay updated with announcements for your child's grade level and sections
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto w-full space-y-4">
          {announcements.length === 0 ? (
            <Card className="p-8 text-center">
              <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">No announcements at the moment</p>
            </Card>
          ) : (
            announcements.map((announcement) => {
              const isRead = readStates.has(announcement.id);
              const isExpanded = expandedId === announcement.id;

              return (
                <Card
                  key={announcement.id}
                  className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                    !isRead ? 'border-red-300 bg-red-50' : ''
                  }`}
                  onClick={() => handleAnnouncementClick(announcement.id)}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {announcement.isPinned && (
                          <Pin className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                        )}
                        <h3 className="text-lg font-bold text-slate-900 break-words">
                          {announcement.title}
                        </h3>
                        <Badge
                          variant="outline"
                          className={`ml-auto shrink-0 ${getCategoryColor(announcement.category)}`}
                        >
                          {announcement.category}
                        </Badge>
                        {!isRead && (
                          <Badge className="bg-red-600 text-white shrink-0">New</Badge>
                        )}
                      </div>

                      <p className={`text-sm ${isExpanded ? '' : 'line-clamp-2'} text-slate-700 whitespace-pre-wrap break-words`}>
                        {announcement.content}
                      </p>

                      {!isExpanded && announcement.content.length > 150 && (
                        <button className="text-xs text-primary font-medium hover:underline mt-2">
                          Read more
                        </button>
                      )}

                      <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                        <span>
                          {(() => {
                            try {
                              const timestamp = announcement.createdAt as any;
                              let date: Date;
                              
                              if (timestamp?.seconds) {
                                date = new Date(timestamp.seconds * 1000);
                              } else if (timestamp?.toDate && typeof timestamp.toDate === 'function') {
                                date = timestamp.toDate();
                              } else if (timestamp instanceof Date) {
                                date = timestamp;
                              } else {
                                date = new Date(timestamp);
                              }

                              return date.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              });
                            } catch (err) {
                              console.error('Date formatting error:', err);
                              return 'Date unavailable';
                            }
                          })()}
                        </span>
                        {announcement.targetGrades && announcement.targetGrades.length > 0 && (
                          <span>For: {announcement.targetGrades.join(', ')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
