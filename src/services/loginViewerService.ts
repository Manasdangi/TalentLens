import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { isE2EMode } from '../utils/e2eMode';

const COLLECTION_NAME = 'LoginPageViewers';
const ALL_TIME_COLLECTION_NAME = 'LoginPageAllTimeViewers';
const SESSION_STORAGE_KEY = 'talentlens_login_viewer_session';
const ALL_TIME_STORAGE_KEY = 'talentlens_login_all_time_viewer';
const ACTIVE_WINDOW_MS = 2 * 60 * 1000;
const HEARTBEAT_MS = 30 * 1000;

export interface LoginViewerCounts {
  onlineCount: number;
  allTimeCount: number | null;
}

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

function getAllTimeViewerId() {
  const existingViewerId = localStorage.getItem(ALL_TIME_STORAGE_KEY);
  if (existingViewerId) {
    return existingViewerId;
  }

  const viewerId =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  localStorage.setItem(ALL_TIME_STORAGE_KEY, viewerId);
  return viewerId;
}

async function registerAndCountAllTimeViewer() {
  const viewerId = getAllTimeViewerId();
  const viewerDocRef = doc(db, ALL_TIME_COLLECTION_NAME, viewerId);
  const viewerSnapshot = await getDoc(viewerDocRef);

  if (!viewerSnapshot.exists()) {
    await setDoc(viewerDocRef, {
      viewerId,
      page: 'candidate-login',
      firstSeenAt: serverTimestamp(),
    });
  }

  const countSnapshot = await getCountFromServer(collection(db, ALL_TIME_COLLECTION_NAME));
  return countSnapshot.data().count;
}

export function subscribeToLoginViewerCount(
  onCountChange: (counts: LoginViewerCounts) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  if (isE2EMode()) {
    onCountChange({ onlineCount: 0, allTimeCount: 0 });
    return () => undefined;
  }

  const sessionId = getViewerSessionId();
  const viewerDocRef = doc(db, COLLECTION_NAME, sessionId);
  const viewersCollectionRef = collection(db, COLLECTION_NAME);
  let allTimeCount: number | null = null;
  let onlineCount = 0;

  const emitCounts = () => {
    onCountChange({ onlineCount, allTimeCount });
  };

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

  registerAndCountAllTimeViewer()
    .then((count) => {
      allTimeCount = count;
      emitCounts();
    })
    .catch((error) => {
      onError?.(error instanceof Error ? error : new Error('Failed to load all-time viewer count'));
    });

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

      onlineCount = activeViewerCount;
      emitCounts();
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
