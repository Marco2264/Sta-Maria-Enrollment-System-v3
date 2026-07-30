import React, { useState, useEffect } from 'react';
import { Bell, Plus, Edit2, Trash2, Pin, AlertCircle, CheckCircle } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Badge } from '../ui/Badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '../ui/Dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/Select';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../lib/AuthContext';
import { Announcement, AnnouncementCategory, getCategoryColor } from '../../lib/services/announcementsService';

export function AdminAnnouncementsView() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'General' as AnnouncementCategory,
    isPinned: false,
    targetGrades: ['All'],
    targetSections: ['All']
  });

  useEffect(() => {
    const q = query(collection(db, 'announcements'));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as Announcement))
          .sort((a, b) => {
            if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
            const aTime = (a.createdAt as any)?.seconds ?? 0;
            const bTime = (b.createdAt as any)?.seconds ?? 0;
            return bTime - aTime;
          });
        setAnnouncements(data);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching announcements:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!formData.title.trim() || !formData.content.trim()) {
      setMessage({ type: 'error', text: 'Title and content are required' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const data = {
        ...formData,
        authorId: user.uid,
        updatedAt: serverTimestamp()
      };

      if (editingId) {
        await updateDoc(doc(db, 'announcements', editingId), data);
        setMessage({ type: 'success', text: 'Announcement updated successfully!' });
      } else {
        await addDoc(collection(db, 'announcements'), {
          ...data,
          createdAt: serverTimestamp()
        });
        setMessage({ type: 'success', text: 'Announcement created successfully!' });
      }

      setIsOpen(false);
      setEditingId(null);
      setFormData({
        title: '',
        content: '',
        category: 'General',
        isPinned: false,
        targetGrades: ['All'],
        targetSections: ['All']
      });
    } catch (error) {
      console.error('Error saving announcement:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save announcement'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;

    try {
      await deleteDoc(doc(db, 'announcements', id));
      setMessage({ type: 'success', text: 'Announcement deleted successfully!' });
    } catch (error) {
      console.error('Error deleting announcement:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to delete announcement'
      });
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setFormData({
      title: announcement.title,
      content: announcement.content,
      category: announcement.category,
      isPinned: announcement.isPinned,
      targetGrades: announcement.targetGrades,
      targetSections: announcement.targetSections
    });
    setEditingId(announcement.id);
    setIsOpen(true);
  };

  const handleTogglePin = async (id: string, isPinned: boolean) => {
    try {
      await updateDoc(doc(db, 'announcements', id), {
        isPinned: !isPinned,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  };

  const handleOpenDialog = () => {
    setEditingId(null);
    setFormData({
      title: '',
      content: '',
      category: 'General',
      isPinned: false,
      targetGrades: ['All'],
      targetSections: ['All']
    });
    setIsOpen(true);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50/50">
      <header className="px-6 py-6 border-b border-slate-200 bg-white shrink-0">
        <div className="max-w-7xl mx-auto w-full space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Bell className="w-5 h-5 text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Announcements Management</h1>
            </div>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleOpenDialog} className="bg-primary text-white hover:bg-primary/90">
                  <Plus className="w-4 h-4 mr-2" />
                  New Announcement
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>
                    {editingId ? 'Edit Announcement' : 'Create New Announcement'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSave} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Announcement title"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Content</Label>
                    <textarea
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="Write your announcement here..."
                      className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[120px]"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v as AnnouncementCategory })}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Emergency">Emergency</SelectItem>
                          <SelectItem value="Event">Event</SelectItem>
                          <SelectItem value="Academic">Academic</SelectItem>
                          <SelectItem value="General">General</SelectItem>
                          <SelectItem value="Maintenance">Maintenance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Target Grades</Label>
                      <Select value={formData.targetGrades[0]} onValueChange={(v) => setFormData({ ...formData, targetGrades: [v] })}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="All">All Grades</SelectItem>
                          {[1, 2, 3, 4, 5, 6].map(g => (
                            <SelectItem key={g} value={`Grade ${g}`}>Grade {g}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isPinned}
                        onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-300"
                      />
                      <span className="text-sm font-medium text-slate-900">Pin this announcement to the top</span>
                    </label>
                  </div>

                  <DialogFooter className="pt-4 flex-col sm:flex-row gap-2 sm:gap-0">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsOpen(false)}
                      className="w-full sm:w-auto"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSaving}
                      className="w-full sm:w-auto"
                    >
                      {isSaving ? 'Saving...' : editingId ? 'Update Announcement' : 'Create Announcement'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <p className="text-sm text-slate-600 ml-11">
            Create and manage announcements for parents and teachers
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto w-full space-y-4">
          {message && (
            <div className={`p-4 rounded-lg flex items-center gap-3 ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0" />
              )}
              <span className="text-sm font-medium">{message.text}</span>
            </div>
          )}

          {announcements.length === 0 ? (
            <Card className="p-8 text-center">
              <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">No announcements yet. Create one to get started!</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {announcements.map((announcement) => (
                <Card key={announcement.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {announcement.isPinned && (
                          <Pin className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                        )}
                        <h3 className="text-base font-bold text-slate-900 break-words">
                          {announcement.title}
                        </h3>
                        <Badge
                          variant="outline"
                          className={`ml-auto shrink-0 ${getCategoryColor(announcement.category)}`}
                        >
                          {announcement.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-700 line-clamp-2 whitespace-pre-wrap">
                        {announcement.content}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                        <span>
                          {new Date((announcement.createdAt as any)?.seconds * 1000 || 0).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        <span>For: {announcement.targetGrades.join(', ')}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleTogglePin(announcement.id, announcement.isPinned)}
                        className={`p-2 rounded-lg transition-colors ${
                          announcement.isPinned
                            ? 'bg-amber-100 text-amber-600'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                        title={announcement.isPinned ? 'Unpin' : 'Pin to top'}
                      >
                        <Pin className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(announcement)}
                        className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-blue-100 hover:text-blue-600 transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(announcement.id)}
                        className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-red-100 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
