const admin = require('firebase-admin');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

admin.initializeApp({
  projectId: config.projectId
});

const db = admin.firestore();

async function check() {
  const users = await db.collection('users').get();
  for (const user of users.docs) {
    const entries = await db.collection('users').doc(user.id).collection('entries').orderBy('createdAt', 'desc').limit(1).get();
    if (!entries.empty) {
      console.log('User:', user.id);
      console.log('Latest entry:', entries.docs[0].data());
    }
  }
}
check().catch(console.error);
