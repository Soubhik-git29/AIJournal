const fs = require('fs');
let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

const importAdmin = "import { AdminView } from './AdminView';\nimport { Shield } from 'lucide-react';\n";
content = content.replace("import { SettingsView } from './SettingsView';", importAdmin + "import { SettingsView } from './SettingsView';");

content = content.replace("type: 'application/json' });", "type: 'application/json' });\n  const [isAdmin, setIsAdmin] = useState(false);\n\n  useEffect(() => {\n    if (!user) return;\n    const checkAdmin = async () => {\n      try {\n        const { getDoc, doc } = require('firebase/firestore');\n        const adminDoc = await getDoc(doc(db, 'admins', user.uid));\n        setIsAdmin(adminDoc.exists());\n      } catch (err) {\n        console.error('Error checking admin status:', err);\n      }\n    };\n    checkAdmin();\n  }, [user]);");

// Add button
const adminBtn = `
          {isAdmin && (
            <button 
              onClick={() => setActiveTab('admin')}
              className={\`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors \${activeTab === 'admin' ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 dark:bg-neutral-900'}\`}
            >
              <Shield size={16} />
              Admin
            </button>
          )}
          <button 
`;
content = content.replace("          <button \n            onClick={() => setActiveTab('settings')}", adminBtn + "            onClick={() => setActiveTab('settings')}");

// Add mobile button
const mobileAdminBtn = `
            {isAdmin && (
              <button 
                onClick={() => setActiveTab('admin')}
                className={\`p-2 rounded-lg \${activeTab === 'admin' ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white' : 'text-neutral-500 dark:text-neutral-400'}\`}
              >
                <Shield size={18} />
              </button>
            )}
            <button 
`;
content = content.replace("            <button \n              onClick={() => setActiveTab('settings')}", mobileAdminBtn + "              onClick={() => setActiveTab('settings')}");


const adminViewRender = `
        {activeTab === 'admin' && isAdmin ? (
          <AdminView />
        ) : activeTab === 'settings' ? (
`;
content = content.replace("{activeTab === 'settings' ? (", adminViewRender);


fs.writeFileSync('src/components/Dashboard.tsx', content);
