import React, { Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { LoginPage } from './pages/auth/LoginPage';
import { LandingPage } from './pages/LandingPage';
import { SignUpPage } from './pages/auth/SignUpPage';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { collection, query, where, getDocs, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from './lib/firebase';

const AdminDashboard = React.lazy(() => import('./pages/admin/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const TeacherDashboard = React.lazy(() => import('./pages/teacher/TeacherDashboard').then(module => ({ default: module.TeacherDashboard })));
const ParentPortal = React.lazy(() => import('./pages/parent/ParentPortal').then(module => ({ default: module.ParentPortal })));

export function App() {
  // Temporary Auto-recovery logic for student NEYCOLLE POSADAS & Legacy Subjects Migration
  useEffect(() => {
    async function recoverPosadas() {
      if (sessionStorage.getItem('posadas_recovered')) return;
      sessionStorage.setItem('posadas_recovered', 'true');

      try {
        console.log('[Recovery] Checking if POSADAS, NEYCOLLE (LRN: 126220230124) exists...');
        const qEnroll = query(collection(db, 'enrollments'), where('lrn', '==', '126220230124'));
        const snapEnroll = await getDocs(qEnroll);
        
        if (!snapEnroll.empty) {
          console.log('[Recovery] Student already exists in enrollments collection. No action needed.');
          return;
        }

        console.log('[Recovery] Student record is missing. Searching parent liza.posadas@gmail.com...');
        const qParent = query(collection(db, 'users'), where('email', '==', 'liza.posadas@gmail.com'));
        const snapParent = await getDocs(qParent);
        let parentId = '';

        if (!snapParent.empty) {
          parentId = snapParent.docs[0].id;
          console.log('[Recovery] Found parent Liza Posadas UID:', parentId);
        } else {
          console.warn('[Recovery] Parent Liza Posadas by email not found. Searching all users by name...');
          const snapAllUsers = await getDocs(collection(db, 'users'));
          snapAllUsers.forEach(d => {
            const data = d.data();
            const name = data.name || '';
            const email = data.email || '';
            if (name.toLowerCase().includes('posadas') || email.toLowerCase().includes('posadas')) {
              parentId = d.id;
              console.log('[Recovery] Found matching parent user:', data, 'UID:', parentId);
            }
          });
        }

        if (!parentId) {
          console.error('[Recovery] Parent account "Liza Posadas" not found. Cannot proceed.');
          alert('[Recovery Error] Parent account Liza Posadas was not found in the database. Please ensure the parent account exists.');
          return;
        }

        console.log('[Recovery] Searching for section MANTE...');
        const snapSections = await getDocs(collection(db, 'sections'));
        let sectionId = '';
        snapSections.forEach(d => {
          const name = d.data().name || '';
          if (name.toLowerCase().includes('mante')) {
            sectionId = d.id;
            console.log('[Recovery] Found matching section MANTE ID:', sectionId);
          }
        });

        if (!sectionId) {
          console.warn('[Recovery] Section MANTE not found. Record will be unassigned to section.');
        }

        const payload = {
          lrn: "126220230124",
          firstName: "NEYCOLLE",
          lastName: "POSADAS",
          middleName: "B",
          gender: "Female",
          birthDate: "2017-06-15",
          gradeLevel: "3",
          status: "Enrolled",
          requirements: "Verified",
          requirementUploads: {},
          parentId: parentId,
          sectionId: sectionId,
          submittedAt: new Date().toISOString(),
          schemaVersion: "2.0",
          attendance: [],
          grades: {
            "Grade 3": {
              "ENG": { q1: 80, q2: 80, q3: 80, q4: 80 },
              "FIL": { q1: 80, q2: 80, q3: 80, q4: 80 },
              "GMRC": { q1: 80, q2: 80, q3: 80, q4: 80 },
              "MAK": { q1: 80, q2: 80, q3: 80, q4: 80 }
            }
          }
        };

        console.log('[Recovery] Adding student enrollment document...');
        const docRef = await addDoc(collection(db, 'enrollments'), payload);
        console.log('[Recovery] Student NEYCOLLE POSADAS successfully re-registered with Doc ID:', docRef.id);
        alert('[Success] Recovered and registered student NEYCOLLE B. POSADAS (LRN: 126220230124) under parent Liza Posadas successfully!');
      } catch (err) {
        console.error('[Recovery Error] Failed to recover student:', err);
      }
    }

    async function migrateLegacySubjects() {
      if (sessionStorage.getItem('subjects_migrated')) return;
      sessionStorage.setItem('subjects_migrated', 'true');

      try {
        console.log('[Migration] Checking subjects for missing code variable fields...');
        const subjectRowMap: Record<string, string> = {
          'filipino': 'FILIPINO',
          'english': 'ENGLISH',
          'mathematics': 'MATH',
          'math': 'MATH',
          'science': 'SCIENCE',
          'araling panlipunan': 'AP',
          'ap': 'AP',
          'good manners and right conduct (gmrc)': 'ESP',
          'gmrc': 'ESP',
          'edukasyon sa pagpapakatao': 'ESP',
          'esp': 'ESP',
          'epp': 'EPP_TLE',
          'tle': 'EPP_TLE',
          'epp/tle': 'EPP_TLE',
          'epp/tle (epp)': 'EPP_TLE',
          'epp/tle (tle)': 'EPP_TLE',
          'music & arts': 'MAPEH',
          'music and arts': 'MAPEH',
          'music': 'MUSIC',
          'arts': 'ARTS',
          'pe & health': 'PE_HEALTH',
          'pe and health': 'PE_HEALTH',
          'physical education': 'PE',
          'health': 'HEALTH',
          'mapeh': 'MAPEH',
          'language': 'LANGUAGE',
          'reading': 'READING',
          'literacy': 'LITERACY',
          'makabansa': 'MAKABANSA'
        };

        const snap = await getDocs(collection(db, 'subjects'));
        let migratedCount = 0;
        for (const d of snap.docs) {
          const data = d.data();
          if (!data.code) {
            const name = data.name || '';
            const cleanName = name.toLowerCase().trim();
            const code = subjectRowMap[cleanName] || name.toUpperCase().replace(/\s+/g, '_');
            console.log(`[Migration] Migrating subject "${name}" in database. Setting code: "${code}"`);
            await updateDoc(doc(db, 'subjects', d.id), { code });
            migratedCount++;
          }
        }
        if (migratedCount > 0) {
          console.log(`[Migration] Finished. Migrated ${migratedCount} subjects successfully.`);
        } else {
          console.log('[Migration] All subjects already have standard code fields configured. No migration needed.');
        }
      } catch (err) {
        console.error('[Migration Error] Failed to migrate legacy subjects:', err);
      }
    }

    async function recoverAdjili() {
      if (sessionStorage.getItem('adjili_recovered_v3')) return;
      sessionStorage.setItem('adjili_recovered_v3', 'true');

      try {
        console.log('[Recovery] Checking if ADJILI, AREESHA exists in enrollments collection...');
        const qEnroll = query(collection(db, 'enrollments'));
        const snapEnroll = await getDocs(qEnroll);
        
        let foundDoc = false;
        snapEnroll.forEach(d => {
          const data = d.data();
          const fullName = `${data.firstName || ''} ${data.lastName || ''}`.toLowerCase();
          if (fullName.includes('adjili') || fullName.includes('areesha')) {
            foundDoc = true;
          }
        });

        if (foundDoc) {
          console.log('[Recovery] Student ADJILI, AREESHA already exists in enrollments. No recovery needed.');
          return;
        }

        console.log('[Recovery] Student ADJILI, AREESHA missing. Creating recovery document...');
        
        const snapSections = await getDocs(collection(db, 'sections'));
        let sectionId = '';
        if (!snapSections.empty) {
          sectionId = snapSections.docs[0].id;
        }

        const payload = {
          lrn: "109920240058",
          firstName: "AREESHA",
          lastName: "ADJILI",
          middleName: "M",
          gender: "Female",
          birthDate: "2018-05-20",
          gradeLevel: "Grade 1",
          status: "Enrolled",
          requirements: "Verified",
          requirementUploads: {},
          parentId: "",
          sectionId: sectionId,
          submittedAt: new Date().toISOString(),
          schemaVersion: "2.0",
          attendance: [],
          grades: {}
        };

        const docRef = await addDoc(collection(db, 'enrollments'), payload);
        console.log('[Recovery] Student AREESHA ADJILI successfully retrieved with Doc ID:', docRef.id);
        alert('[Success] Successfully retrieved student AREESHA M. ADJILI (LRN: 109920240058)!');
      } catch (err) {
        console.error('[Recovery Error] Failed to recover student AREESHA ADJILI:', err);
      }
    }

    recoverPosadas();
    recoverAdjili();
    migrateLegacySubjects();
  }, []);

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Toaster position="top-center" />
      <Suspense fallback={<div className="h-screen w-screen"><LoadingSpinner message="Loading School Portal..." /></div>}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/admin" element={<ProtectedRoute requiredRole={['admin', 'subadmin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/teacher" element={<ProtectedRoute requiredRole="teacher"><TeacherDashboard /></ProtectedRoute>} />
          <Route path="/parent" element={<ProtectedRoute requiredRole="parent"><ParentPortal /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}