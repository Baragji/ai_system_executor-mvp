const fs = require('fs');
const path = '/Users/Yousef_1/Downloads/ai_system_executor-mvp/src/server.ts';
let src = fs.readFileSync(path, 'utf8');
let changed = 0;
// Patch 1: inside plan execution catch (planError)
if (/catch \(planError\) \{[\s\S]*?fallback to single/.test(src) && !/catch \(planError\) \{\n\s*if \(planError instanceof PausedError\)/.test(src)) {
  src = src.replace(/catch \(planError\) \{\n/, match => match + '            if (planError instanceof PausedError) {\n              throw planError;\n            }\n');
  changed++;
}
// Patch 2: decomposition catch (error) before console.warn("Planning decomposition failed...")
if (/console\.warn\("Planning decomposition failed, falling back to single execution", error\);/.test(src) && !/if \(error instanceof PausedError\) \{\n\s*throw error;\n\s*\}\n\s*console\.warn\("Planning decomposition failed, falling back to single execution", error\);/.test(src)) {
  src = src.replace(/console\.warn\("Planning decomposition failed, falling back to single execution", error\);/, 'if (error instanceof PausedError) {\n          throw error;\n        }\n        console.warn("Planning decomposition failed, falling back to single execution", error);');
  changed++;
}
fs.writeFileSync(path, src);
console.log('patchesApplied', changed);
