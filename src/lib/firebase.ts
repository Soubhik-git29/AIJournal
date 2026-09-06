import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  projectId: "project-e0118b97-0b9f-419e-b29",
  appId: "1:970460650652:web:6e87177f274c34bc98e159",
  apiKey: "AIzaSyBvlM06Ntx5MEohkTukMhuYlJ9brDkKs5c",
  authDomain: "project-e0118b97-0b9f-419e-b29.firebaseapp.com",
  // Ignore typescript error if firestoreDatabaseId is not in types
  // @ts-ignore
  firestoreDatabaseId: "ai-studio-c0e0731d-934c-45b2-851b-eb9815f6c68c",
  storageBucket: "project-e0118b97-0b9f-419e-b29.firebasestorage.app",
  messagingSenderId: "970460650652",
  measurementId: "",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, "ai-studio-c0e0731d-934c-45b2-851b-eb9815f6c68c");
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  const result = await signInWithPopup(auth, googleProvider);
  if (result.user) {
    await setDoc(doc(db, "users", result.user.uid), {
      id: result.user.uid,
      email: result.user.email,
      displayName: result.user.displayName,
      photoURL: result.user.photoURL,
    }, { merge: true });
  }
  return result;
};

export const logOut = () => signOut(auth);
