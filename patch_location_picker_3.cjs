const fs = require('fs');
let content = fs.readFileSync('src/components/LocationPicker.tsx', 'utf8');

const target = `          setIsOpen(false);
        } catch (err) {`;
const replacement = `          // Reset the input so dropdown closes
          element.value = '';
          element.blur && element.blur();
          
          // Manually clean up any orphaned pac-containers just in case
          setTimeout(() => {
             document.querySelectorAll('.pac-container').forEach(el => el.remove());
          }, 100);

          setIsOpen(false);
        } catch (err) {`;

content = content.replace(target, replacement);

const target2 = `          setIsOpen(false);
        }
      });`;
const replacement2 = `          // Reset the input so dropdown closes
          element.value = '';
          element.blur && element.blur();

          setTimeout(() => {
             document.querySelectorAll('.pac-container').forEach(el => el.remove());
          }, 100);

          setIsOpen(false);
        }
      });`;

content = content.replace(target2, replacement2);

const target3 = `      <button type="button" onClick={() => setIsOpen(false)} className="absolute right-2 top-2 p-1 bg-white rounded-full text-neutral-500 hover:text-red-500 z-10">`;
const replacement3 = `      <button type="button" onClick={() => {
        if (autocompleteElementRef.current) {
           autocompleteElementRef.current.value = '';
        }
        setTimeout(() => {
           document.querySelectorAll('.pac-container').forEach(el => el.remove());
        }, 100);
        setIsOpen(false);
      }} className="absolute right-2 top-2 p-1 bg-white rounded-full text-neutral-500 hover:text-red-500 z-10">`;

content = content.replace(target3, replacement3);

fs.writeFileSync('src/components/LocationPicker.tsx', content);
