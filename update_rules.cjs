const fs = require('fs');
let content = fs.readFileSync('firestore.rules', 'utf8');

const helpers = `
    function isAdmin() {
      return request.auth != null && (
        exists(/databases/$(database)/documents/admins/$(request.auth.uid)) ||
        request.auth.token.email == 'soubhikkumardey@gmail.com'
      );
    }
`;

content = content.replace("  match /databases/{database}/documents {", "  match /databases/{database}/documents {\n" + helpers);

const adminRules = `
    match /admins/{adminId} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }
`;

content = content.replace("    match /users/{userId}/entries/{entryId} {", adminRules + "    match /users/{userId}/entries/{entryId} {");

fs.writeFileSync('firestore.rules', content);
