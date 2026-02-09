
const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('packages/web/server/index.js');
console.log(`Reading ${targetFile}...`);

let content = fs.readFileSync(targetFile, 'utf8');

// --- Patch 1: readSettingsFromDisk ---
const oldReadSettings = `const readSettingsFromDisk = async () => {
  try {
    const raw = await fsPromises.readFile(SETTINGS_FILE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
    return {};
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      return {};
    }
    console.warn('Failed to read settings file:', error);
    return {};
  }
};`;

const newReadSettings = `const readSettingsFromDisk = async () => {
  let userSettings = {};
  try {
    const raw = await fsPromises.readFile(SETTINGS_FILE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      userSettings = parsed;
    }
  } catch (error) {
    if (!error || typeof error !== 'object' || error.code !== 'ENOENT') {
      console.warn('Failed to read settings file:', error);
    }
  }

  // Check for project-local .dev/settings.json
  try {
    const projectSettingsPath = path.resolve(process.cwd(), '.dev', 'settings.json');
    if (fs.existsSync(projectSettingsPath)) {
       const raw = await fsPromises.readFile(projectSettingsPath, 'utf8');
       const parsed = JSON.parse(raw);
       if (parsed && typeof parsed === 'object' && parsed.simplechamber) {
         return {
           ...userSettings,
           simplechamber: parsed.simplechamber,
         };
       }
    }
  } catch (error) {
    // Ignore
  }

  return userSettings;
};`;

if (content.includes(oldReadSettings)) {
  content = content.replace(oldReadSettings, newReadSettings);
  console.log('Patched readSettingsFromDisk');
} else {
  console.error('Could not find readSettingsFromDisk code block to patch');
  // Attempt looser match or manual inspection if needed, but strict is better for now
}

// --- Patch 2: sanitizeSettingsUpdate ---
const oldSanitizeStart = `  const candidate = payload;
  const result = {};`;

const newSanitizeStart = `  const candidate = payload;
  const result = {};

  if (candidate.simplechamber && typeof candidate.simplechamber === 'object') {
    result.simplechamber = candidate.simplechamber;
  }`;

if (content.includes(oldSanitizeStart)) {
  content = content.replace(oldSanitizeStart, newSanitizeStart);
  console.log('Patched sanitizeSettingsUpdate');
} else {
  console.error('Could not find sanitizeSettingsUpdate code block to patch');
}

fs.writeFileSync(targetFile, content, 'utf8');
console.log('Done.');
