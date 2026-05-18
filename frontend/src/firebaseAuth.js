import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyBapoinIT_tvYscJWVyH0B7VnsaM6l3bsw',
  authDomain: 'noryx-platform.firebaseapp.com',
  projectId: 'noryx-platform',
  storageBucket: 'noryx-platform.firebasestorage.app',
  messagingSenderId: '302683175009',
  appId: '1:302683175009:web:41fcbd08e5844145801220',
  measurementId: 'G-F8WVJ5NV4T',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export function observeAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function signUpWithEmail({ email, password, firstName, lastName }) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const displayName = [firstName, lastName].filter(Boolean).join(' ').trim();
  if (displayName) {
    await updateProfile(credential.user, { displayName });
  }
  await sendEmailVerification(credential.user);
  return credential.user;
}

export async function signInWithEmail({ email, password }) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export function sendVerificationEmail(user) {
  return sendEmailVerification(user);
}

export function logoutFirebaseUser() {
  return signOut(auth);
}
