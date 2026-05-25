import * as fs from 'fs';
import * as path from 'path';

const LOG_DIR = path.join(process.cwd(), 'commit_logs');
const BACKUP_FILE = path.join(LOG_DIR, 'backup.json');

interface ExtConfig {
  env: string;
  appid: string;
  appName: string;
  [key: string]: unknown;
}

interface ExtJson {
  extEnable: boolean;
  extAppid: string;
  directCommit: boolean;
  ext: ExtConfig;
  window?: Record<string, unknown>;
  [key: string]: unknown;
}

interface CodeCommitParams {
  appid: string;
  templateId: number;
  userDesc: string;
  userVersion: string;
  extJson: ExtJson;
}

interface SubmitConfigItem {
  appid: string;
  ext: Record<string, unknown>;
  isStop?: boolean;
  [key: string]: unknown;
}

interface CodeCommitWithDate extends CodeCommitParams {
  _fileDate?: string;
}

function getOutputFile(): string {
  const now = new Date();
  const timestamp = now.toISOString().slice(0, 16).replace('T', '_').replace(':', '');
  return path.join(LOG_DIR, `output-${timestamp}.json`);
}

// Find all operation-base-service log files
function findLogFiles(): string[] {
  const files = fs.readdirSync(LOG_DIR)
    .filter(f => f.startsWith('operation-base-service-special-code-mark.') && f.endsWith('.log'))
    .sort();
  return files.map(f => path.join(LOG_DIR, f));
}

// Load backup and extract isStop map
function loadBackup(): Map<string, boolean> {
  const isStopMap = new Map<string, boolean>();
  if (!fs.existsSync(BACKUP_FILE)) {
    return isStopMap;
  }
  try {
    const raw = fs.readFileSync(BACKUP_FILE, 'utf-8');
    const backup: SubmitConfigItem[] = JSON.parse(raw);
    for (const item of backup) {
      if (item.isStop) {
        isStopMap.set(item.appid, true);
      }
    }
  } catch (e) {
    console.error('Failed to load backup:', e);
  }
  return isStopMap;
}

// Extract request params from log content
function extractRequestParams(content: string, fileDate: string): CodeCommitParams[] {
  const records: CodeCommitParams[] = [];
  const regex = /请求参数: (\[\{[\s\S]*?\}]), 响应:/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    try {
      const paramsStr = match[1];
      const parsed = JSON.parse(paramsStr);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          (item as CodeCommitWithDate)._fileDate = fileDate;
          records.push(item as CodeCommitParams);
        }
      }
    } catch (e) {
      console.error('Failed to parse:', e);
    }
  }

  return records;
}


// Merge records: same appid keeps the latest (by date)
function mergeByAppid(records: CodeCommitWithDate[]): CodeCommitWithDate[] {
  const map = new Map<string, CodeCommitWithDate>();

  for (const record of records) {
    const existing = map.get(record.appid);
    if (!existing || (record._fileDate && existing._fileDate && record._fileDate > existing._fileDate)) {
      map.set(record.appid, record);
    }
  }

  return Array.from(map.values());
}

// Convert CodeCommitParams to SubmitConfigItem
// Mirrors the normalizeImport logic from submit-configs/page.tsx
function toSubmitConfig(record: CodeCommitParams): SubmitConfigItem {
  const item = record;
  const extJson = item.extJson as Record<string, unknown> | undefined;

  if (extJson) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { extEnable, extAppid, directCommit, ext, ...restExtJson } = extJson;
    const extFields = (ext as Record<string, unknown>) || {};
    const extraFields = restExtJson as Record<string, unknown>;
    const appid = (item.appid as string) || "";

    const result: SubmitConfigItem = { appid, ext: extFields, ...extraFields };
    return result;
  }

  return { appid: item.appid as string, ext: {} };
}

function main(): void {
  const files = findLogFiles();
  console.log(`Found ${files.length} log files`);

  const isStopMap = loadBackup();
  console.log(`Loaded ${isStopMap.size} backup records with isStop`);

  const allRecords: CodeCommitWithDate[] = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const fileDate = path.basename(file).match(/(\d{4}-\d{2}-\d{2})/)?.[1] || '';
    const records = extractRequestParams(content, fileDate);
    console.log(`${path.basename(file)}: extracted ${records.length} records`);
    allRecords.push(...records);
  }

  // Sort by date descending
  allRecords.sort((a, b) => {
    const dateA = a._fileDate || '';
    const dateB = b._fileDate || '';
    return dateB.localeCompare(dateA);
  });

  // Deduplicate by appid, keeping latest
  const merged = mergeByAppid(allRecords);

  // Convert to SubmitConfigItem
  const output: SubmitConfigItem[] = merged.map(toSubmitConfig);

  // Merge with backup: keep isStop from backup
  for (const item of output) {
    if (isStopMap.has(item.appid)) {
      item.isStop = true;
    }
  }

  // Add backup records that don't exist in logs
  const logAppids = new Set(output.map(o => o.appid));
  if (fs.existsSync(BACKUP_FILE)) {
    try {
      const raw = fs.readFileSync(BACKUP_FILE, 'utf-8');
      const backup: SubmitConfigItem[] = JSON.parse(raw);
      for(let i = backup.length - 1; i >= 0; --i) {
        const item = backup[i]
        if (!logAppids.has(item.appid)) {
          output.unshift(item);
        }
      }
    } catch (e) {
      console.error('Failed to load backup:', e);
    }
  }

  const outputFile = getOutputFile();
  fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
  console.log(`\nTotal: ${output.length} records (${merged.length} from logs + ${output.length - merged.length} from backup only)`);
  console.log(`Output to ${outputFile}`);
}

main();
