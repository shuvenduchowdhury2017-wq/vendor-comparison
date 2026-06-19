'use client'

import * as XLSX from 'xlsx'

type VendorInfo = { rank: string; vendorName: string; vendorEmail: string; category: string; total: number; inviteId: string }
type ItemRate = { inviteId: string; unitRate: number | null; amount: number | null; remarks: string }
type ItemInfo = { id: string; slNo: number; itemName: string; description: string; uom: string; quantity: number; rates: ItemRate[] }

type Props = {
  projectName: string
  workName: string
  vendors: VendorInfo[]
  items: ItemInfo[]
}

export default function CSExportButton({ projectName, workName, vendors, items }: Props) {
  function exportToExcel() {
    const wb = XLSX.utils.book_new()

    const header1 = ['Sl.No', 'Item Name', 'Description', 'UOM', 'Quantity']
    for (const v of vendors) {
      header1.push(`${v.rank} - ${v.vendorName} Rate`, `${v.rank} - ${v.vendorName} Amount`)
    }
    const header2 = ['', '', '', '', '']
    for (const _v of vendors) {
      header2.push('Unit Rate (₹)', 'Amount (₹)')
    }

    const rows: (string | number)[][] = [header1, header2]
    for (const item of items) {
      const row: (string | number)[] = [item.slNo, item.itemName, item.description, item.uom, item.quantity]
      for (const v of vendors) {
        const rate = item.rates.find((r) => r.inviteId === v.inviteId)
        row.push(rate?.unitRate ?? '', rate?.amount ?? '')
      }
      rows.push(row)
    }

    const totalRow: (string | number)[] = ['', '', '', '', 'Grand Total']
    for (const v of vendors) {
      totalRow.push('', v.total)
    }
    rows.push(totalRow)

    const rankRow: (string | number)[] = ['', '', '', '', 'Rank']
    for (const v of vendors) {
      rankRow.push('', v.rank)
    }
    rows.push(rankRow)

    const ws = XLSX.utils.aoa_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, 'Comparative Statement')

    const summaryData = [
      ['Comparative Statement'],
      [`Project: ${projectName}`],
      [`Work: ${workName}`],
      [],
      ['Rank', 'Vendor Name', 'Email', 'Category', 'Total Amount (₹)'],
      ...vendors.map((v) => [v.rank, v.vendorName, v.vendorEmail, v.category, v.total]),
    ]
    const ws2 = XLSX.utils.aoa_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(wb, ws2, 'Summary')

    XLSX.writeFile(wb, `CS_${projectName.replace(/\s+/g, '_')}.xlsx`)
  }

  return (
    <button
      onClick={exportToExcel}
      className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors font-medium"
    >
      Export Excel
    </button>
  )
}
