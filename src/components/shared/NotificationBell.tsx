import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  CheckCheck,
  Megaphone,
  Clock,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  Calendar,
  BookOpen,
  FileText,
  X,
  ExternalLink,
  Paperclip,
  User,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';
import {
  subscribeUserNotifications,
  markAnnouncementAsRead,
  markAllAnnouncementsAsRead,
  AnnouncementNotification
} from '../../lib/services/notificationService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { cn } from '../ui/utils';

interface NotificationBellProps {
  onNavigate?: (view: string) => void;
  userGrades?: string[];
  userSections?: string[];
  className?: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  onNavigate,
  userGrades,
  userSections,
  className
}) => {
  const { user, role, userData } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AnnouncementNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementNotification | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const currentUserId = user?.uid || (userData as any)?.id || (userData as any)?.uid || '';
  const currentRole = role || (userData as any)?.role || 'parent';

  // Real-time notification subscription
  useEffect(() => {
    if (!currentUserId) return;

    const unsubscribe = subscribeUserNotifications(
      currentUserId,
      currentRole,
      (notifs, count) => {
        setNotifications(notifs);
        setUnreadCount(count);
      },
      userGrades,
      userSections
    );

    return () => {
      unsubscribe();
    };
  }, [currentUserId, currentRole, userGrades, userSections]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleItemClick = (notif: AnnouncementNotification) => {
    // Mark as read immediately
    if (!notif.isRead && currentUserId) {
      markAnnouncementAsRead(notif.id, currentUserId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    setSelectedAnnouncement(notif);
    setIsOpen(false);
  };

  const handleMarkAllAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
    if (unreadIds.length > 0 && currentUserId) {
      markAllAnnouncementsAsRead(unreadIds, currentUserId);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    }
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'Emergency':
      case 'Class Suspension':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'Event':
      case 'Events':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Academic':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Maintenance':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <>
      <div className={cn('relative inline-block', className)} ref={containerRef}>
        {/* Bell Trigger Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-200 cursor-pointer relative border',
            isOpen
              ? 'bg-red-50 text-[#D8232A] border-red-200 shadow-inner'
              : unreadCount > 0
              ? 'bg-white text-slate-700 hover:text-[#D8232A] hover:bg-red-50/50 border-slate-200/80 shadow-xs'
              : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-slate-200/80 shadow-xs'
          )}
          title="Announcements Notifications"
          aria-label="Notifications"
        >
          <Bell
            className={cn(
              'w-4.5 h-4.5 transition-transform duration-200',
              unreadCount > 0 && 'text-[#D8232A]'
            )}
          />

          {/* Unread Badge Counter */}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[19px] h-[19px] px-1 bg-[#D8232A] text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-md border-2 border-white animate-in zoom-in-50 duration-150">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Mobile Backdrop Overlay for Dropdown */}
        {isOpen && (
          <div
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-[1px] z-40 sm:hidden"
            onClick={() => setIsOpen(false)}
          />
        )}

        {/* Notification Dropdown Popover (Mobile Responsive Position) */}
        {isOpen && (
          <div className="fixed inset-x-3.5 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2.5 w-auto sm:w-[400px] max-h-[calc(100vh-120px)] sm:max-h-[520px] bg-white rounded-3xl border border-slate-200/90 shadow-2xl z-50 overflow-hidden animate-in fade-in-50 slide-in-from-top-2 duration-200 select-none flex flex-col">
            {/* Header */}
            <div className="p-3.5 sm:p-5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-red-50 text-[#D8232A] flex items-center justify-center border border-red-100 shadow-2xs shrink-0">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-sm text-slate-900">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-red-100 text-[#D8232A] text-[10px] font-black border border-red-200">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium leading-none mt-0.5">
                    School & class announcements
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-[10px] sm:text-[11px] font-bold text-[#D8232A] hover:text-red-700 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Mark all read</span>
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="sm:hidden w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer border-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notification Items List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="py-12 px-6 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <Megaphone className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-700">No Announcements</p>
                    <p className="text-[11px] text-slate-400">
                      You are all caught up! No recent notifications to show.
                    </p>
                  </div>
                </div>
              ) : (
                notifications.slice(0, 10).map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleItemClick(notif)}
                    className={cn(
                      'p-3.5 sm:p-4 transition-all duration-150 cursor-pointer flex gap-3 relative group',
                      !notif.isRead
                        ? 'bg-red-50/40 hover:bg-red-50/70'
                        : 'bg-white hover:bg-slate-50'
                    )}
                  >
                    {/* Unread Status Dot Indicator */}
                    <div className="shrink-0 pt-1">
                      {!notif.isRead ? (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#D8232A] ring-4 ring-red-100 animate-pulse" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-slate-200" />
                      )}
                    </div>

                    {/* Announcement Content Preview */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0 rounded-md',
                            getCategoryBadgeClass(notif.category)
                          )}
                        >
                          {notif.category}
                        </Badge>
                        <span className="text-[10px] font-medium text-slate-400 shrink-0 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {notif.timeAgo}
                        </span>
                      </div>

                      <h4
                        className={cn(
                          'text-xs leading-snug line-clamp-1 break-words',
                          !notif.isRead
                            ? 'font-black text-slate-900'
                            : 'font-semibold text-slate-700'
                        )}
                      >
                        {notif.title}
                      </h4>

                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed break-words">
                        {notif.content}
                      </p>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] font-bold text-slate-400 truncate">
                          By: {notif.author}
                        </span>
                        <span
                          className={cn(
                            'text-[10px] font-extrabold uppercase tracking-wider',
                            !notif.isRead
                              ? 'text-[#D8232A]'
                              : 'text-slate-400'
                          )}
                        >
                          {!notif.isRead ? 'Unread' : 'Read'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Dropdown Footer */}
            <div className="p-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between shrink-0">
              <Button
                variant="ghost"
                onClick={() => {
                  setIsOpen(false);
                  if (onNavigate) onNavigate('announcements');
                }}
                className="w-full h-9 rounded-xl text-xs font-bold text-[#D8232A] hover:bg-red-50 hover:text-red-700 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>View All Announcements</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Redesigned School Announcement Detail Modal (Fully Responsive) */}
      {selectedAnnouncement && (
        <Dialog
          open={!!selectedAnnouncement}
          onOpenChange={(open) => {
            if (!open) setSelectedAnnouncement(null);
          }}
        >
          <DialogContent className="w-[92vw] sm:max-w-2xl max-h-[88vh] p-0 overflow-hidden rounded-3xl border border-slate-200/90 shadow-2xl bg-white font-sans flex flex-col">
            {/* Header Section */}
            <div className="p-4 sm:p-7 border-b border-slate-100 bg-white relative shrink-0">
              {/* Top Meta Row: Badge & Close Button */}
              <div className="flex items-center justify-between gap-3 mb-2 sm:mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-red-50 text-[#D8232A] border border-red-200/70 text-[10px] sm:text-[11px] font-black uppercase tracking-wider">
                    <Megaphone className="w-3.5 h-3.5" />
                    <span>Announcement</span>
                  </div>

                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider px-2 sm:px-2.5 py-0.5 rounded-full border',
                      getCategoryBadgeClass(selectedAnnouncement.category)
                    )}
                  >
                    {selectedAnnouncement.category}
                  </Badge>
                </div>
              </div>

              {/* Prominent Announcement Title */}
              <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight leading-snug break-words">
                {selectedAnnouncement.title}
              </h2>

              {/* Metadata Info Bar */}
              <div className="flex flex-wrap items-center gap-y-1.5 gap-x-3 sm:gap-x-4 mt-2.5 sm:mt-3.5 pt-2.5 sm:pt-3 border-t border-slate-100 text-[11px] sm:text-xs text-slate-500 font-medium">
                {/* Author */}
                <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                  <User className="w-3.5 h-3.5 text-[#D8232A] shrink-0" />
                  <span className="truncate">
                    By: <strong className="text-slate-900">{selectedAnnouncement.author}</strong>
                    {selectedAnnouncement.authorRole && (
                      <span className="text-slate-400 font-normal ml-1">({selectedAnnouncement.authorRole})</span>
                    )}
                  </span>
                </div>

                {/* Date & Time */}
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    {selectedAnnouncement.date || selectedAnnouncement.timeAgo}
                    {selectedAnnouncement.time && ` • ${selectedAnnouncement.time}`}
                  </span>
                </div>

                {/* Target Audience if specified */}
                {selectedAnnouncement.targetGradeLevel && (
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Audience: <strong>{selectedAnnouncement.targetGradeLevel}</strong></span>
                  </div>
                )}
              </div>
            </div>

            {/* Scrollable Announcement Body */}
            <div className="p-4 sm:p-7 space-y-4 sm:space-y-5 flex-1 overflow-y-auto custom-scrollbar bg-white">
              {/* Main Content Typography */}
              <div className="text-xs sm:text-[15px] text-slate-700 whitespace-pre-wrap leading-relaxed font-normal break-words">
                {selectedAnnouncement.content}
              </div>

              {/* Attached Image Preview (if image) */}
              {selectedAnnouncement.attachmentUrl && selectedAnnouncement.attachmentType === 'image' && (
                <div className="mt-3 pt-3 sm:mt-4 sm:pt-4 border-t border-slate-100 space-y-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-[#D8232A]" /> Attached Image
                  </p>
                  <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 shadow-xs max-h-[220px] sm:max-h-[300px] flex items-center justify-center">
                    <img
                      src={selectedAnnouncement.attachmentUrl}
                      alt={selectedAnnouncement.attachmentName || 'Announcement attachment'}
                      className="max-h-[220px] sm:max-h-[300px] w-full object-contain"
                    />
                  </div>
                </div>
              )}

              {/* Attached Document Card (if file / pdf / doc) */}
              {selectedAnnouncement.attachmentUrl && selectedAnnouncement.attachmentType !== 'image' && (
                <div className="mt-3 pt-3 sm:mt-4 sm:pt-4 border-t border-slate-100 space-y-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-[#D8232A]" /> Attachment
                  </p>
                  <div className="flex items-center justify-between p-3 sm:p-3.5 bg-slate-50/80 hover:bg-slate-100/80 border border-slate-200/80 rounded-2xl transition-colors">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-[#D8232A] shrink-0">
                        <FileText className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {selectedAnnouncement.attachmentName || 'Document Attachment'}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                          {selectedAnnouncement.attachmentType || 'File'}
                        </p>
                      </div>
                    </div>
                    <a
                      href={selectedAnnouncement.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 border border-slate-200 shadow-2xs transition-all shrink-0 ml-2"
                    >
                      <span>Open File</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 sm:px-7 sm:py-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
              <div className="text-[11px] sm:text-xs font-bold text-emerald-600 flex items-center gap-1.5 select-none">
                <CheckCheck className="w-4 h-4" />
                <span>Marked as Read</span>
              </div>
              <Button
                onClick={() => setSelectedAnnouncement(null)}
                className="h-8 sm:h-9 px-5 sm:px-6 rounded-xl bg-[#D8232A] hover:bg-red-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
