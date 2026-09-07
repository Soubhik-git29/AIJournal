const fs = require('fs');
let content = fs.readFileSync('src/components/LocationPicker.tsx', 'utf8');

const target2 = `    if (!autocompleteElementRef.current) {`;
const replacement2 = `    if (!autocompleteElementRef.current) {`;

content = content.replace(`    if (!autocompleteElementRef.current) {`, `    if (autocompleteElementRef.current) {
      containerRef.current.appendChild(autocompleteElementRef.current);
    } else {`);

fs.writeFileSync('src/components/LocationPicker.tsx', content);
