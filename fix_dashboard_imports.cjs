const fs = require('fs');
let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

const locationPickerImport = "import { LocationPicker } from './LocationPicker';\nimport { LocationData } from '../types';\nimport { MapPin } from 'lucide-react';\n";
content = content.replace("import { WeeklyReflectionView } from './WeeklyReflectionView';", "import { WeeklyReflectionView } from './WeeklyReflectionView';\n" + locationPickerImport);

content = content.replace("const [isPublic, setIsPublic] = useState(false);", "const [isPublic, setIsPublic] = useState(false);\n  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);");

content = content.replace("const userPrompt = input.trim();", "const userPrompt = input.trim();\n    const entryLocation = selectedLocation;");

content = content.replace("prompt: userPrompt,", "prompt: userPrompt,\n        location: entryLocation || null,");

fs.writeFileSync('src/components/Dashboard.tsx', content);
