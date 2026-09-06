const fs = require('fs');
let content = fs.readFileSync('src/types.ts', 'utf8');

const newTypes = `
export interface LocationData {
  name: string;
  address?: string;
  lat: number;
  lng: number;
}
`;

content = newTypes + '\n' + content;
content = content.replace('isPublic?: boolean;', 'isPublic?: boolean;\n  location?: LocationData;');
fs.writeFileSync('src/types.ts', content);
