const fs = require('fs');

function fixDarks(code) {
  return code
    .replace(/dark:bg-neutral-900 dark:bg-neutral-100/g, 'dark:bg-neutral-900')
    .replace(/dark:text-white dark:text-neutral-200/g, 'dark:text-white')
    .replace(/dark:text-neutral-400 dark:text-neutral-500/g, 'dark:text-neutral-400')
    .replace(/dark:border-neutral-800 dark:border-neutral-800/g, 'dark:border-neutral-800');
}

const files = ['src/components/Dashboard.tsx', 'src/components/WeeklyReflectionView.tsx', 'src/components/CounsellorView.tsx', 'src/components/FriendsView.tsx', 'src/components/ChatView.tsx'];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = fixDarks(content);
  fs.writeFileSync(file, content);
}
