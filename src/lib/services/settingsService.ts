import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

export interface GlobalSettings {
  // Academic Year Settings
  activeSchoolYear: string;
  enrollmentOpen: boolean;
  schoolYearStart: string;
  schoolYearEnd: string;
  
  // Grading Periods (up to 3rd Term)
  firstTermStart: string;
  firstTermEnd: string;
  secondTermStart: string;
  secondTermEnd: string;
  thirdTermStart: string;
  thirdTermEnd: string;
  
  // School Information
  schoolName: string;
  schoolAddress: string;
  contactNumber: string;
  emailAddress: string;
  principalName: string;
  schoolId: string;
  region: string;
  division: string;
  district: string;
}

const defaultSettings: GlobalSettings = {
  activeSchoolYear: '2023-2024',
  enrollmentOpen: true,
  schoolYearStart: '',
  schoolYearEnd: '',
  firstTermStart: '',
  firstTermEnd: '',
  secondTermStart: '',
  secondTermEnd: '',
  thirdTermStart: '',
  thirdTermEnd: '',
  schoolName: 'Sta. Maria Elementary School',
  schoolAddress: 'Sta. Maria, Bulacan',
  contactNumber: '',
  emailAddress: '',
  principalName: 'Juan Dela Cruz',
  schoolId: '199006',
  region: 'IX',
  division: 'Zamboanga',
  district: 'Sta. Maria Central',
};

const SETTINGS_DOC_ID = 'global';
const SETTINGS_COLLECTION = 'settings';

export const getGlobalSettings = async (): Promise<GlobalSettings> => {
  try {
    const settingsRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
    const settingsSnap = await getDoc(settingsRef);
    
    if (settingsSnap.exists()) {
      return { ...defaultSettings, ...settingsSnap.data() } as GlobalSettings;
    } else {
      // Create default settings if none exist
      await setDoc(settingsRef, defaultSettings);
      return defaultSettings;
    }
  } catch (error) {
    console.error("Error fetching global settings:", error);
    throw error;
  }
};

export const updateGlobalSettings = async (updates: Partial<GlobalSettings>): Promise<void> => {
  try {
    const settingsRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
    await updateDoc(settingsRef, updates);
  } catch (error) {
    console.error("Error updating global settings:", error);
    throw error;
  }
};
