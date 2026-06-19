'use client'

export default function DraftPrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="bg-orange-700 hover:bg-orange-800 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors"
    >
      Print / Save PDF
    </button>
  )
}
