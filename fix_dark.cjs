const fs = require('fs');

function addDarkClasses(code) {
  return code
    .replace(/\bbg-white\b/g, 'bg-white dark:bg-neutral-950')
    .replace(/\bbg-neutral-50\b/g, 'bg-neutral-50 dark:bg-neutral-900')
    .replace(/\bbg-neutral-100\b/g, 'bg-neutral-100 dark:bg-neutral-800')
    .replace(/\bbg-neutral-900 text-white\b/g, 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900')
    .replace(/\bbg-neutral-900\b/g, 'bg-neutral-900 dark:bg-neutral-100')
    .replace(/\bborder-neutral-200\b/g, 'border-neutral-200 dark:border-neutral-800')
    .replace(/\bborder-neutral-100\b/g, 'border-neutral-100 dark:border-neutral-800')
    .replace(/\btext-neutral-900\b/g, 'text-neutral-900 dark:text-white')
    .replace(/\btext-neutral-800\b/g, 'text-neutral-800 dark:text-neutral-200')
    .replace(/\btext-neutral-600\b/g, 'text-neutral-600 dark:text-neutral-400')
    .replace(/\btext-neutral-500\b/g, 'text-neutral-500 dark:text-neutral-400')
    .replace(/\btext-neutral-400\b/g, 'text-neutral-400 dark:text-neutral-500')
    .replace(/\bhover:bg-neutral-50\b/g, 'hover:bg-neutral-50 dark:hover:bg-neutral-800')
    .replace(/\bhover:text-neutral-900\b/g, 'hover:text-neutral-900 dark:hover:text-white')
    .replace(/\bhover:text-neutral-600\b/g, 'hover:text-neutral-600 dark:hover:text-neutral-300')
    .replace(/\btext-white dark:text-neutral-900\b/g, 'text-white dark:text-neutral-900') // prevent double
    .replace(/\bbg-white dark:bg-neutral-950 dark:bg-neutral-950\b/g, 'bg-white dark:bg-neutral-950') // cleanup
}

const files = ['src/components/Dashboard.tsx', 'src/components/WeeklyReflectionView.tsx', 'src/components/CounsellorView.tsx', 'src/components/FriendsView.tsx', 'src/components/ChatView.tsx'];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = addDarkClasses(content);
  fs.writeFileSync(file, content);
}
