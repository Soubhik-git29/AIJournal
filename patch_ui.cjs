const fs = require('fs');
let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

const target = `                          <div className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-neutral-400">
                            {entry.isPublic ? (
                              <><Globe size={10} /> Public</>
                            ) : (
                              <><Lock size={10} /> Private</>
                            )}
                          </div>`;

const replacement = `                          <div className="flex flex-wrap items-center justify-end gap-3 text-[10px] uppercase font-bold tracking-wider text-neutral-400 mt-1">
                            <span className="flex items-center gap-1">
                              {entry.isPublic ? <><Globe size={10} /> Public</> : <><Lock size={10} /> Private</>}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar size={10} />
                              {format(entry.createdAt, 'MMM d, h:mm a')}
                            </span>
                            {entry.mood && (
                              <span className="flex items-center gap-1">
                                <Sparkles size={10} />
                                {entry.mood}
                              </span>
                            )}
                            {entry.location && (
                              <span className="flex items-center gap-1 text-blue-500/80">
                                <MapPin size={10} />
                                {entry.location.name}
                              </span>
                            )}
                          </div>`;

content = content.replace(target, replacement);

fs.writeFileSync('src/components/Dashboard.tsx', content);
