const fs = require('fs');
let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

const target = `{entry.location.name}`;
const replacement = `{entry.location.name || entry.location.address || "Unknown Location"} {JSON.stringify(entry.location)}`;

content = content.replace(target, replacement);

fs.writeFileSync('src/components/Dashboard.tsx', content);
