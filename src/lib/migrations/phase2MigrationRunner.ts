import {
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  buildPhase2EnrollmentMigrationPlan,
  MigrationPlanItem
} from './phase2SafeMigrations';

const ENROLLMENTS_COLLECTION = 'enrollments';
const DEFAULT_BATCH_SIZE = 200;

export async function createPhase2EnrollmentMigrationPlanFromDb() {
  const snapshot = await getDocs(query(collection(db, ENROLLMENTS_COLLECTION)));
  const rows = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
  return buildPhase2EnrollmentMigrationPlan(rows);
}

export async function applyPhase2EnrollmentMigrationPlan(
  plan: MigrationPlanItem[],
  options?: {
    dryRun?: boolean;
    batchSize?: number;
  }
) {
  const dryRun = options?.dryRun ?? true;
  const batchSize = options?.batchSize ?? DEFAULT_BATCH_SIZE;

  if (dryRun) {
    return {
      applied: 0,
      total: plan.length,
      dryRun: true
    };
  }

  let applied = 0;

  for (let i = 0; i < plan.length; i += batchSize) {
    const chunk = plan.slice(i, i + batchSize);
    const batch = writeBatch(db);

    chunk.forEach((item) => {
      batch.update(doc(db, ENROLLMENTS_COLLECTION, item.enrollmentId), item.patch);
    });

    await batch.commit();
    applied += chunk.length;
  }

  return {
    applied,
    total: plan.length,
    dryRun: false
  };
}

export async function patchSingleEnrollmentToPhase2(
  enrollmentId: string,
  patch: Record<string, unknown>
) {
  if (Object.keys(patch).length === 0) return;
  await updateDoc(doc(db, ENROLLMENTS_COLLECTION, enrollmentId), patch);
}
