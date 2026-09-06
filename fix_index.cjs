const fs = require('fs');
let content = fs.readFileSync('src/components/FriendsView.tsx', 'utf8');

content = content.replace(
  "where('isPublic', '==', true),\n        orderBy('createdAt', 'desc'),\n        limit(5)",
  "where('isPublic', '==', true)"
);

fs.writeFileSync('src/components/FriendsView.tsx', content);
