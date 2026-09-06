const fs = require('fs');
let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

const adminStateCode = `  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    const checkAdmin = async () => {
      try {
        if (user.email === 'soubhikkumardey@gmail.com') {
          setIsAdmin(true);
          return;
        }
        const { getDoc, doc } = require('firebase/firestore');
        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        setIsAdmin(adminDoc.exists());
      } catch (err) {
        console.error('Error checking admin status:', err);
      }
    };
    checkAdmin();
  }, [user]);`;

// Remove the wrongly placed code
const badCode = `  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    const checkAdmin = async () => {
      try {
        if (user.email === 'soubhikkumardey@gmail.com') {
          setIsAdmin(true);
          return;
        }
        const { getDoc, doc } = require('firebase/firestore');
        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        setIsAdmin(adminDoc.exists());
      } catch (err) {

        console.error('Error checking admin status:', err);
      }
    };
    checkAdmin();
  }, [user]);`;

// Wait, the newlines and indentation might be slightly different. Let's just use replace with regex.
content = content.replace(/  const \[isAdmin, setIsAdmin\] = useState\(false\);[\s\S]*?checkAdmin\(\);\n  \}, \[user\]\);/g, '');

// Insert it at the top of the component
content = content.replace("const user = auth.currentUser;", "const user = auth.currentUser;\n\n" + adminStateCode);

fs.writeFileSync('src/components/Dashboard.tsx', content);
