/**
 * batchService.ts
 *
 * Provides a utility layer over Firestore batch writes.
 * Firestore limits a single batch to 500 operations.
 * This service automatically chunks large sets of operations
 * into multiple batches and commits them sequentially.
 *
 * Architectural Decision:
 *  - Chunking strategy: commit each 500-op batch before starting the next.
 *  - No parallel batch commits to avoid race conditions on shared documents.
 *  - All errors are surfaced; partial commits are logged for manual recovery.
 */

import {
  db,
} from '../firebase';
import {
  collection,
  doc,
  writeBatch,
  DocumentReference,
  DocumentData,
  UpdateData,
  WithFieldValue,
  PartialWithFieldValue,
  SetOptions,
} from 'firebase/firestore';

// Firestore hard limit per batch
const FIRESTORE_BATCH_LIMIT = 500;

// ─── Operation Types ──────────────────────────────────────────────────────────

type SetOperation<T extends DocumentData> = {
  type: 'set';
  ref: DocumentReference<T>;
  data: WithFieldValue<T> | PartialWithFieldValue<T>;
  options?: SetOptions;
};

type UpdateOperation<T extends DocumentData> = {
  type: 'update';
  ref: DocumentReference<T>;
  data: UpdateData<T>;
};

type DeleteOperation = {
  type: 'delete';
  ref: DocumentReference<DocumentData>;
};

export type BatchOperation<T extends DocumentData = DocumentData> =
  | SetOperation<T>
  | UpdateOperation<T>
  | DeleteOperation;

// ─── Core Batch Executor ──────────────────────────────────────────────────────

/**
 * Commits an array of BatchOperations across multiple Firestore batches,
 * respecting the 500-operation limit per batch.
 *
 * @param operations - Array of set / update / delete operations.
 * @returns Promise<void> - Rejects on first batch failure.
 */
export async function commitBatch(
  operations: BatchOperation[]
): Promise<void> {
  if (operations.length === 0) return;

  const chunks = chunkArray(operations, FIRESTORE_BATCH_LIMIT);
  let committedCount = 0;

  for (const chunk of chunks) {
    const batch = writeBatch(db);

    for (const op of chunk) {
      if (op.type === 'set') {
        const setOp = op as SetOperation<DocumentData>;
        if (setOp.options) {
          batch.set(setOp.ref, setOp.data as WithFieldValue<DocumentData>, setOp.options);
        } else {
          batch.set(setOp.ref, setOp.data as WithFieldValue<DocumentData>);
        }
      } else if (op.type === 'update') {
        const updateOp = op as UpdateOperation<DocumentData>;
        batch.update(updateOp.ref, updateOp.data);
      } else if (op.type === 'delete') {
        batch.delete(op.ref);
      }
    }

    try {
      await batch.commit();
      committedCount += chunk.length;
    } catch (error) {
      console.error(
        `[batchService] Batch commit failed after ${committedCount} successful operations.`,
        'Failed chunk size:',
        chunk.length,
        error
      );
      throw new Error(
        `Batch write partially failed. ${committedCount} operations committed before error. ` +
        `Check console for details. Manual recovery may be required.`
      );
    }
  }
}

// ─── Convenience Helpers ──────────────────────────────────────────────────────

/**
 * Bulk-set multiple documents in a collection.
 * Useful for seeding or bulk imports.
 *
 * @param collectionPath - Firestore collection path (e.g. 'students')
 * @param docs - Array of { id, data } objects. If id is omitted, a new doc ref is auto-generated.
 * @param merge - If true, performs a merge instead of full overwrite.
 */
export async function bulkSet<T extends DocumentData>(
  collectionPath: string,
  docs: Array<{ id?: string; data: WithFieldValue<T> }>,
  merge = false
): Promise<void> {
  const colRef = collection(db, collectionPath);
  const operations: BatchOperation<T>[] = docs.map(({ id, data }) => ({
    type: 'set',
    ref: (id ? doc(colRef, id) : doc(colRef)) as DocumentReference<T>,
    data,
    ...(merge ? { options: { merge: true } as SetOptions } : {}),
  }));

  await commitBatch(operations as BatchOperation[]);
}

/**
 * Bulk-update multiple documents by their IDs in a collection.
 *
 * @param collectionPath - Firestore collection path.
 * @param updates - Array of { id, data } for partial field updates.
 */
export async function bulkUpdate<T extends DocumentData>(
  collectionPath: string,
  updates: Array<{ id: string; data: UpdateData<T> }>
): Promise<void> {
  const colRef = collection(db, collectionPath);
  const operations: BatchOperation<T>[] = updates.map(({ id, data }) => ({
    type: 'update',
    ref: doc(colRef, id) as DocumentReference<T>,
    data,
  }));

  await commitBatch(operations as BatchOperation[]);
}

/**
 * Bulk-delete documents by their IDs in a collection.
 *
 * @param collectionPath - Firestore collection path.
 * @param ids - Array of document IDs to delete.
 */
export async function bulkDelete(
  collectionPath: string,
  ids: string[]
): Promise<void> {
  const colRef = collection(db, collectionPath);
  const operations: DeleteOperation[] = ids.map((id) => ({
    type: 'delete',
    ref: doc(colRef, id),
  }));

  await commitBatch(operations);
}

// ─── Internal Utilities ───────────────────────────────────────────────────────

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
