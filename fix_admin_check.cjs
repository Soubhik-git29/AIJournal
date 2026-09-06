const fs = require('fs');
let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

const updatedCheck = `
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
`;

content = content.replace(/const checkAdmin = async \(\) => \{\n      try \{\n        const \{ getDoc, doc \} = require\('firebase\/firestore'\);\n        const adminDoc = await getDoc\(doc\(db, 'admins', user.uid\)\);\n        setIsAdmin\(adminDoc.exists\(\)\);\n      \} catch \(err\) \{/g, updatedCheck);

fs.writeFileSync('src/components/Dashboard.tsx', content);
