const fs = require('fs');

function fix(code) {
  return code
    .replace(/dark:bg-neutral-100 dark:bg-white/g, 'dark:bg-white')
    .replace(/text-white dark:text-neutral-900 dark:text-white/g, 'text-white dark:text-neutral-900')
    .replace(/dark:hover:bg-neutral-800 dark:hover:bg-neutral-800/g, 'dark:hover:bg-neutral-200');
}

const files = ['src/components/Dashboard.tsx', 'src/components/WeeklyReflectionView.tsx', 'src/components/CounsellorView.tsx', 'src/components/FriendsView.tsx', 'src/components/ChatView.tsx'];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = fix(content);
  fs.writeFileSync(file, content);
}
