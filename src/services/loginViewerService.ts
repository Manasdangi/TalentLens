import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const COLLECTION_NAME = 'LoginPageViewers';
const SESSION_STORAGE_KEY = 'talentlens_login_viewer_session';
const ACTIVE_WINDOW_MS = 2 * 60 * 1000;
const HEARTBEAT_MS = 30 * 1000;

function getViewerSessionId() {
  const existingSessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (existingSessionId) {
    return existingSessionId;
  }

  const sessionId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  return sessionId;
}

export function subscribeToLoginViewerCount(
  onCountChange: (count: number) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const sessionId = getViewerSessionId();
  const viewerDocRef = doc(db, COLLECTION_NAME, sessionId);
  const viewersCollectionRef = collection(db, COLLECTION_NAME);

  const writeHeartbeat = async () => {
    await setDoc(
      viewerDocRef,
      {
        sessionId,
        page: 'candidate-login',
        lastSeenAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
  };

  writeHeartbeat().catch((error) => {
    onError?.(error instanceof Error ? error : new Error('Failed to update viewer count'));
  });

  const unsubscribe = onSnapshot(
    viewersCollectionRef,
    (snapshot) => {
      const activeSince = Date.now() - ACTIVE_WINDOW_MS;
      const activeViewerCount = snapshot.docs.filter((viewerDoc) => {
        const lastSeenAt = viewerDoc.data().lastSeenAt;
        return lastSeenAt instanceof Timestamp && lastSeenAt.toMillis() >= activeSince;
      }).length;

      onCountChange(activeViewerCount);
    },
    (error) => {
      onError?.(error);
    }
  );

  const heartbeatId = window.setInterval(() => {
    writeHeartbeat().catch((error) => {
      onError?.(error instanceof Error ? error : new Error('Failed to update viewer count'));
    });
  }, HEARTBEAT_MS);

  const removeViewer = () => {
    void deleteDoc(viewerDocRef).catch(() => {
      // A stale heartbeat expires from the displayed count after ACTIVE_WINDOW_MS.
    });
  };

  window.addEventListener('beforeunload', removeViewer);

  return () => {
    window.clearInterval(heartbeatId);
    window.removeEventListener('beforeunload', removeViewer);
    unsubscribe();
    removeViewer();
  };
}
