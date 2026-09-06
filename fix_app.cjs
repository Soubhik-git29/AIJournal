const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const importStatement = "import { APIProvider } from '@vis.gl/react-google-maps';\n";

content = content.replace("import { Dashboard } from './components/Dashboard';", "import { Dashboard } from './components/Dashboard';\n" + importStatement);

const renderLogic = `
  const content = user ? <Dashboard /> : <Auth />;
  
  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "dummy"} solutionChannel="GMP_mcp_codeassist_v1_aistudio">
      {content}
    </APIProvider>
  );
`;

content = content.replace("return user ? <Dashboard /> : <Auth />;", renderLogic);

fs.writeFileSync('src/App.tsx', content);
