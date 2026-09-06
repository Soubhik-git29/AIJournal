const fs = require('fs');
let content = fs.readFileSync('src/components/FriendsView.tsx', 'utf8');

const uiCode = `
        {friendEntries.length > 0 && (
          <div className="pt-8 border-t border-neutral-100 dark:border-neutral-800">
            <h2 className="text-xl font-serif mb-6 flex items-center gap-2">
              <Globe size={20} className="text-neutral-400" />
              Friends' Public Journals
            </h2>
            <div className="space-y-6">
              {friendEntries.map(entry => (
                <div key={entry.id} className="bg-neutral-50 dark:bg-neutral-900 rounded-2xl p-6 border border-neutral-100 dark:border-neutral-800 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-white dark:bg-neutral-800 rounded-full flex items-center justify-center font-bold text-neutral-500 shadow-sm">
                      {entry.userInitial}
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-white">{entry.userDisplayName}</p>
                      <p className="text-xs text-neutral-500 flex items-center gap-1">
                        <Clock size={12} /> {new Date(entry.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 p-4 rounded-xl shadow-sm text-sm border border-neutral-100 dark:border-neutral-800">
                      <span className="text-neutral-400 font-medium mr-2">Prompt:</span> 
                      {entry.prompt}
                    </div>
                    <div className="markdown-body prose prose-sm max-w-none prose-neutral dark:prose-invert pl-2 border-l-2 border-neutral-200 dark:border-neutral-700">
                      <Markdown>{entry.response}</Markdown>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
`;

content = content.replace("      </div>\n    </div>", uiCode + "\n    </div>");
fs.writeFileSync('src/components/FriendsView.tsx', content);
