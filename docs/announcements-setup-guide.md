# Announcements Feature - Setup Guide

## What's Needed to Use Announcements

The Announcements feature requires two Firestore collections:

### 1. **Firestore Collection: `announcements`**

Add documents with this structure:

```json
{
  "title": "School is Closed Tomorrow",
  "content": "Due to the weather emergency, school is closed tomorrow. Regular classes will resume the day after.",
  "category": "Emergency",
  "isPinned": true,
  "targetGrades": ["All"],
  "targetSections": ["All"],
  "authorId": "admin_user_id",
  "createdAt": {Firestore Timestamp},
  "updatedAt": {Firestore Timestamp}
}
```

### Example Announcements to Add:

**Announcement 1 - Emergency (Pinned)**
```json
{
  "title": "Important: School Closure Notice",
  "content": "School will be closed on July 25-26 due to the scheduled maintenance. Regular classes resume on July 27.",
  "category": "Emergency",
  "isPinned": true,
  "targetGrades": ["All"],
  "targetSections": ["All"],
  "authorId": "admin",
  "createdAt": Timestamp.now(),
  "updatedAt": Timestamp.now()
}
```

**Announcement 2 - Event**
```json
{
  "title": "Grade 1 Field Trip to the Zoo",
  "content": "All Grade 1 students are invited to a field trip to the city zoo on August 5, 2026. Please bring packed lunch and water bottle. Permission slips are attached.",
  "category": "Event",
  "isPinned": false,
  "targetGrades": ["Grade 1"],
  "targetSections": ["All"],
  "authorId": "admin",
  "createdAt": Timestamp.now(),
  "updatedAt": Timestamp.now()
}
```

**Announcement 3 - Academic**
```json
{
  "title": "Mid-Term Exams Schedule Released",
  "content": "The mid-term examination schedule for Grade 4 has been released. Exams will begin on August 10 and end on August 20. Please prepare your children accordingly.",
  "category": "Academic",
  "isPinned": false,
  "targetGrades": ["Grade 4"],
  "targetSections": ["All"],
  "authorId": "admin",
  "createdAt": Timestamp.now(),
  "updatedAt": Timestamp.now()
}
```

**Announcement 4 - General**
```json
{
  "title": "New Canteen Menu Available",
  "content": "The canteen has updated its menu for the new school year. Check the bulletin board for the complete list of food options and prices.",
  "category": "General",
  "isPinned": false,
  "targetGrades": ["All"],
  "targetSections": ["All"],
  "authorId": "admin",
  "createdAt": Timestamp.now(),
  "updatedAt": Timestamp.now()
}
```

### 2. **Firestore Collection: `announcementReads` (Optional)**

This collection tracks which announcements each parent has read. It's created automatically when a parent clicks on an announcement.

Structure:
```json
{
  "announcementId": "{announcement_document_id}",
  "parentId": "{parent_user_uid}",
  "readAt": {Firestore Timestamp}
}
```

## How to Add Announcements in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Go to **Firestore Database**
4. Create a new collection called **`announcements`**
5. Click **Add Document** and add the JSON examples above
6. Set the document IDs as auto-generated

## Testing the Feature

1. **Login as a parent** in the parent portal
2. Make sure the parent has at least **one enrolled child** with a grade level
3. Click **Announcements** in the sidebar
4. You should see announcements that match:
   - `targetGrades` that include the child's grade
   - `targetGrades` that include "All"
   - `targetSections` that include "All"

## Field Definitions

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `title` | String | Announcement headline | "School Closure Notice" |
| `content` | String | Full announcement text | "School will be closed..." |
| `category` | String | Category badge | "Emergency", "Event", "Academic", "General", "Maintenance" |
| `isPinned` | Boolean | Whether to pin to top | `true` or `false` |
| `targetGrades` | Array | Grades this applies to | `["Grade 1", "Grade 2"]` or `["All"]` |
| `targetSections` | Array | Specific sections (optional) | `["Grade 1-Mabini"]` or `["All"]` |
| `authorId` | String | Admin user ID who posted | `"admin_user_id"` |
| `createdAt` | Timestamp | When posted | `Timestamp.now()` |
| `updatedAt` | Timestamp | Last update | `Timestamp.now()` |

## Category Colors

- **Emergency** 🔴 - Red background (for urgent notices)
- **Event** 🟢 - Green background (for school events)
- **Academic** 🔵 - Blue background (for academic announcements)
- **General** ⚪ - Gray background (for general info)
- **Maintenance** 🟡 - Yellow background (for maintenance notices)

## Important Notes

- Parents will **only see announcements** that match their children's grade levels
- **Pinned announcements** always appear at the top
- **New announcements** are marked with a blue "New" badge until the parent views them
- The feature supports **Grade 1-6** (as per your school spec)
- Use `targetGrades: ["All"]` for school-wide announcements

## Troubleshooting

If announcements don't appear:

1. **Check parent has children** - Parent must have at least one enrolled child
2. **Check grade level** - Ensure child's grade matches announcement's `targetGrades`
3. **Check browser console** - Look for error messages (F12 → Console tab)
4. **Verify Firestore** - Make sure `announcements` collection exists and has documents
5. **Clear cache** - Try refreshing the browser (Ctrl+Shift+R)
