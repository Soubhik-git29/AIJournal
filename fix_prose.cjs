const fs = require('fs');

function fixProse(code) {
  return code.replace(/\bprose-neutral\b/g, 'prose-neutral dark:prose-invert');
}

const files = ['src/components/Dashboard.tsx', 'src/components/WeeklyReflectionView.tsx', 'src/components/CounsellorView.tsx', 'src/components/FriendsView.tsx', 'src/components/ChatView.tsx'];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = fixProse(content);
  fs.writeFileSync(file, content);
}
