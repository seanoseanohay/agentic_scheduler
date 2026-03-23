'use client'

interface BulkActionsProps {
  selected: string[]
  onSelectAll: () => void
  onClearSelection: () => void
  onBulkApprove: () => void
  totalVisible: number
  loading: boolean
}

export function BulkActions({
  selected,
  onSelectAll,
  onClearSelection,
  onBulkApprove,
  totalVisible,
  loading,
}: BulkActionsProps) {
  if (totalVisible === 0) return null

  return (
    <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2">
      <input
        type="checkbox"
        checked={selected.length === totalVisible && totalVisible > 0}
        onChange={selected.length === totalVisible ? onClearSelection : onSelectAll}
        className="h-4 w-4 rounded border-gray-300 text-blue-600"
      />
      <span className="text-sm text-blue-700">
        {selected.length > 0 ? `${selected.length} selected` : `${totalVisible} suggestions`}
      </span>
      {selected.length > 0 && (
        <>
          <button
            onClick={onBulkApprove}
            disabled={loading}
            className="ml-auto rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Approving...' : `Approve ${selected.length}`}
          </button>
          <button
            onClick={onClearSelection}
            className="text-xs text-blue-500 hover:underline"
          >
            Clear
          </button>
        </>
      )}
    </div>
  )
}
