import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, limit, orderBy } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app);

async function check() {
  // we don't have auth, so security rules might block us.
  // Actually, wait, the security rules say: 
  // allow read: if request.auth != null && (request.auth.uid == userId || resource.data.isPublic == true);
}
