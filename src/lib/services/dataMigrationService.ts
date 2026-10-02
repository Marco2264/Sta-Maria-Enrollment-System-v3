import { collection, query, where, getDocs, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Runs startup migrations and auto-recoveries for legacy database records.
 * Uses sessionStorage guards so they run only once per session.
 */
export async function runStartupMigrations() {
  await Promise.allSettled([
    recoverPosadas(),
    recoverAdjili(),
    migrateLegacySubjects()
  ]);
}

async function recoverPosadas() {
  if (sessionStorage.getItem('posadas_recovered')) return;
  sessionStorage.setItem('posadas_recovered', 'true');

  try {
    const qEnroll = query(collection(db, 'enrollments'), where('lrn', '==', '126220230124'));
    const snapEnroll = await getDocs(qEnroll);
    
    if (!snapEnroll.empty) {
      return;
    }

    const qParent = query(collection(db, 'users'), where('email', '==', 'liza.posadas@gmail.com'));
    const snapParent = await getDocs(qParent);
    let parentId = '';

    if (!snapParent.empty) {
      parentId = snapParent.docs[0].id;
    } else {
      const snapAllUsers = await getDocs(collection(db, 'users'));
      snapAllUsers.forEach(d => {
        const data = d.data();
        const name = data.name || '';
        const email = data.email || '';
        if (name.toLowerCase().includes('posadas') || email.toLowerCase().includes('posadas')) {
          parentId = d.id;
        }
      });
    }

    if (!parentId) return;

    const snapSections = await getDocs(collection(db, 'sections'));
    let sectionId = '';
    snapSections.forEach(d => {
      const name = d.data().name || '';
      if (name.toLowerCase().includes('mante')) {
        sectionId = d.id;
      }
    });

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

    await addDoc(collection(db, 'enrollments'), payload);
  } catch (err) {
    console.warn('[Recovery Error] Failed to recover student:', err);
  }
}

async function migrateLegacySubjects() {
  if (sessionStorage.getItem('subjects_migrated')) return;
  sessionStorage.setItem('subjects_migrated', 'true');

  try {
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
    for (const d of snap.docs) {
      const data = d.data();
      if (!data.code) {
        const name = data.name || '';
        const cleanName = name.toLowerCase().trim();
        const code = subjectRowMap[cleanName] || name.toUpperCase().replace(/\s+/g, '_');
        await updateDoc(doc(db, 'subjects', d.id), { code });
      }
    }
  } catch (err) {
    console.warn('[Migration Error] Failed to migrate legacy subjects:', err);
  }
}

async function recoverAdjili() {
  if (sessionStorage.getItem('adjili_recovered_v3')) return;
  sessionStorage.setItem('adjili_recovered_v3', 'true');

  try {
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

    if (foundDoc) return;

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

    await addDoc(collection(db, 'enrollments'), payload);
  } catch (err) {
    console.warn('[Recovery Error] Failed to recover student AREESHA ADJILI:', err);
  }
}
