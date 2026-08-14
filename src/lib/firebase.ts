import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { HistoryRecord, HouseholdProfile } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(
  app,
  firebaseConfig.firestoreDatabaseId || '(default)'
);

const BILLS_COLLECTION = 'electricity_bills';
const SETTINGS_COLLECTION = 'app_settings';
const PROFILE_DOC_ID = 'household_master_profile';

/**
 * Save Household Master Profile (Members & Air Conditioner Definitions) to Firebase
 */
export async function saveHouseholdProfileToFirebase(profile: HouseholdProfile): Promise<void> {
  const docRef = doc(db, SETTINGS_COLLECTION, PROFILE_DOC_ID);
  const dataToSave = {
    ...profile,
    updatedAt: new Date().toISOString(),
  };
  await setDoc(docRef, dataToSave, { merge: true });
}

/**
 * Subscribe to Household Master Profile in real-time from Firebase
 */
export function subscribeToHouseholdProfileFromFirebase(
  callback: (profile: HouseholdProfile | null) => void
): () => void {
  const docRef = doc(db, SETTINGS_COLLECTION, PROFILE_DOC_ID);
  const unsubscribe = onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        callback({
          residents: data.residents || [],
          meters: data.meters || [],
          updatedAt: data.updatedAt,
        });
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error('Error fetching household profile from Firebase:', error);
    }
  );
  return unsubscribe;
}

/**
 * Save an electricity bill record to Firebase Firestore
 */
export async function saveBillToFirebase(record: HistoryRecord): Promise<string> {
  const docRef = doc(db, BILLS_COLLECTION, record.id);
  const dataToSave = {
    ...record,
    updatedAt: new Date().toISOString(),
  };
  await setDoc(docRef, dataToSave, { merge: true });
  return record.id;
}

/**
 * Delete an electricity bill record from Firebase Firestore
 */
export async function deleteBillFromFirebase(id: string): Promise<void> {
  const docRef = doc(db, BILLS_COLLECTION, id);
  await deleteDoc(docRef);
}

/**
 * Subscribe to all electricity bill records from Firestore in real-time
 */
export function subscribeToBillsFromFirebase(
  callback: (records: HistoryRecord[], loading: boolean, error?: string) => void
): () => void {
  const colRef = collection(db, BILLS_COLLECTION);
  const q = query(colRef, orderBy('createdAt', 'desc'));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const records: HistoryRecord[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        records.push({
          id: docSnap.id,
          createdAt: data.createdAt || new Date().toISOString(),
          periodName: data.periodName || data.config?.title || '未命名電費帳單',
          config: data.config,
          residents: data.residents || [],
          subMeters: data.subMeters || [],
          result: data.result,
        } as HistoryRecord);
      });
      callback(records, false);
    },
    (error) => {
      console.error('Error subscribing to Firebase bills:', error);
      callback([], false, error.message);
    }
  );

  return unsubscribe;
}
