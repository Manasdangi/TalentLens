import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDm_YCMJsEND1N6wBkO0M2vR9ArMUjz_Q4",
  authDomain: "talentlens-13926.firebaseapp.com",
  projectId: "talentlens-13926",
  storageBucket: "talentlens-13926.firebasestorage.app",
  messagingSenderId: "116544640539",
  appId: "1:116544640539:web:9f09431e70066e02834abe",
  measurementId: "G-3MCL9BW06W"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();