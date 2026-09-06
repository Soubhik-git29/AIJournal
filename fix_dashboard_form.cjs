const fs = require('fs');
let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

const locationPickerUI = `
                    <LocationPicker onLocationSelect={setSelectedLocation} selectedLocation={selectedLocation} />
                    <button
                      type="button"
`;

content = content.replace(/<button\s*type="button"\s*onClick=\{\(\) => setIsPublic\(\!isPublic\)\}/g, locationPickerUI + `                      onClick={() => setIsPublic(!isPublic)}`);

// We should also display the location in the journal entry cards.
// Let's find where the entry is rendered.
const entryRenderReplace = `
                  <div className="flex items-center gap-4 text-xs font-medium text-neutral-400 dark:text-neutral-500 mb-3">
                    <span className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded-md text-neutral-600 dark:text-neutral-400">
                      <Clock size={12} />
                      {format(entry.createdAt, 'h:mm a')}
                    </span>
                    {entry.mood && (
                      <span className="px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-md">
                        {entry.mood}
                      </span>
                    )}
                    {entry.location && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-md text-blue-500 dark:text-blue-400 truncate max-w-[150px]">
                        <MapPin size={12} />
                        {entry.location.name}
                      </span>
                    )}
                  </div>
`;
content = content.replace(/<div className="flex items-center gap-4 text-xs font-medium text-neutral-400 dark:text-neutral-500 mb-3">[\s\S]*?<\/div>/, entryRenderReplace);

fs.writeFileSync('src/components/Dashboard.tsx', content);
