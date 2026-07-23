import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = {
  apiKey: "AIzaSyBl3vYRUFpVq3wLhtCB4x4C98RgjE8DsX0",
  authDomain: "testing-cb30a.firebaseapp.com",
  projectId: "testing-cb30a",
  storageBucket: "testing-cb30a.firebasestorage.app",
  messagingSenderId: "956184072356",
  appId: "1:956184072356:web:656f8809a5bfe3ebc11631"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const backupPath = 'C:\\Sta. System\\sta_maria_db_backup_2026-07-23.json';
const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

async function importData() {
  console.log('Starting import to testing-cb30a...');
  for (const [collectionName, documents] of Object.entries(backupData)) {
    if (Array.isArray(documents)) {
      console.log(`Importing ${documents.length} docs to ${collectionName}...`);
      for (const docData of documents) {
        const id = docData.id;
        const dataToSave = { ...docData };
        delete dataToSave.id;
        
        await setDoc(doc(collection(db, collectionName), id || Math.random().toString(36).substring(7)), dataToSave);
      }
    } else if (documents && typeof documents === 'object') {
        if (collectionName === 'schoolYear') {
            console.log(`Importing school year...`);
            const sy = { ...documents };
            const id = sy.id || 'default';
            delete sy.id;
            await setDoc(doc(collection(db, 'school_years'), id), sy);
        }
    }
  }
  console.log("Import Complete!");
  process.exit(0);
}

importData().catch(err => {
    console.error("Error during import:", err);
    process.exit(1);
});
