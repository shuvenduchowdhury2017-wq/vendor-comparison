/**
 * Import BOQ reference data from an Excel file into the BoqReference table.
 *
 * Usage:
 *   node scripts/import-boq-reference.mjs                          (uses BOQ Data/BOQ_SEARCH_PGE.xlsx)
 *   node scripts/import-boq-reference.mjs "path/to/some-file.xlsx"
 *
 * Re-run this whenever the source Excel changes. It fully replaces the
 * existing reference rows (de-duplicated on item name + description).
 */
import * as XLSX from 'xlsx'
import Database from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'

const root = process.cwd()
const srcArg = process.argv[2]
const srcFile = srcArg
  ? path.resolve(root, srcArg)
  : path.join(root, 'BOQ Data', 'BOQ_SEARCH_PGE.xlsx')
const dbPath = path.join(root, 'dev.db')

if (!fs.existsSync(srcFile)) {
  console.error(`Source file not found: ${srcFile}`)
  process.exit(1)
}

console.log(`Reading: ${srcFile}`)
const wb = XLSX.read(fs.readFileSync(srcFile), { type: 'buffer' })
const ws = wb.Sheets[wb.SheetNames[0]]
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

// Find the header row (the one containing "BOQ ITEM NAME")
const norm = (v) => String(v ?? '').trim().toUpperCase()
const headerIdx = rows.findIndex((r) => r.some((c) => norm(c) === 'BOQ ITEM NAME'))
if (headerIdx === -1) {
  console.error('Could not find a header row containing "BOQ ITEM NAME".')
  process.exit(1)
}
const header = rows[headerIdx].map(norm)
const col = (name) => header.indexOf(name)
const cName = col('BOQ ITEM NAME')
const cDesc = col('BOQ DESCRIPTION')
const cUom = col('BOQ UOM')
const cCat = col('CATEGORY')

const get = (row, i) => (i >= 0 ? String(row[i] ?? '').trim() : '')

const seen = new Set()
const records = []
for (let i = headerIdx + 1; i < rows.length; i++) {
  const row = rows[i]
  const itemName = get(row, cName)
  if (!itemName) continue
  const description = get(row, cDesc)
  const uom = get(row, cUom)
  const category = get(row, cCat)
  const key = (itemName + '||' + description).toLowerCase()
  if (seen.has(key)) continue
  seen.add(key)
  records.push({
    itemName,
    description,
    uom,
    category,
    searchText: (itemName + ' ' + description).toLowerCase(),
  })
}

console.log(`Parsed ${records.length} distinct reference rows. Writing to ${dbPath} ...`)

const db = new Database(dbPath)
db.pragma('journal_mode = WAL')
db.exec('DELETE FROM BoqReference')
const insert = db.prepare(
  'INSERT INTO BoqReference (itemName, description, uom, category, searchText) VALUES (@itemName, @description, @uom, @category, @searchText)'
)
const insertMany = db.transaction((recs) => {
  for (const r of recs) insert.run(r)
})
insertMany(records)
const count = db.prepare('SELECT COUNT(*) AS n FROM BoqReference').get().n
db.close()

console.log(`Done. BoqReference now has ${count} rows.`)
