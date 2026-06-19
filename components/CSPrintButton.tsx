'use client'

export default function CSPrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-black transition-colors font-medium"
    >
      Print / Save PDF
    </button>
  )
}
