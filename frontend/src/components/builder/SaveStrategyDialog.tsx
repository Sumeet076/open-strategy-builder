import { useState } from 'react'
import { X, Save, Tag } from 'lucide-react'
import { clsx } from 'clsx'
import { StrategyLeg } from '../../types'

interface SaveStrategyDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: any) => void
  legs: StrategyLeg[]
  underlying: string
}

export function SaveStrategyDialog({ isOpen, onClose, onSave, legs, underlying }: SaveStrategyDialogProps) {
  if (!isOpen) return null

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleTagAdd = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault()
      const tag = tagInput.trim().toLowerCase()
      if (!tags.includes(tag)) {
        setTags([...tags, tag])
      }
      setTagInput('')
    }
  }

  const handleTagRemove = (tag: string) => {
    setTags(tags.filter(t => t !== tag))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsSaving(true)
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        tags,
        legs: legs.map(l => ({
          ...l,
          entryPrice: l.entryPrice || undefined,
        })),
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-in">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-dark-200">
            <h3 className="text-lg font-semibold text-dark-900">Save Strategy</h3>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-dark-100 text-dark-500"
              disabled={isSaving}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <div className="p-4 space-y-4">
            {/* Strategy Name */}
            <div>
              <label className="label">Strategy Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., NIFTY Iron Condor Jan 2024"
                className="input"
                autoFocus
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="label">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description of the strategy..."
                className="input min-h-[80px] resize-y"
                rows={3}
              />
            </div>

            {/* Tags */}
            <div>
              <label className="label">Tags</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag) => (
                  <span key={tag} className="badge badge-primary flex items-center gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleTagRemove(tag)}
                      className="hover:text-primary-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-dark-400" />
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagAdd}
                  placeholder="Add tag (press Enter)..."
                  className="input flex-1"
                />
              </div>
              <p className="text-xs text-dark-500">Press Enter to add tags</p>
            </div>

            {/* Legs Summary */}
            <div className="bg-dark-50 rounded-lg p-3">
              <p className="text-sm font-medium text-dark-700 mb-2">{legs.length} legs will be saved</p>
              <div className="space-y-1 max-h-40 overflow-auto">
                {legs.map((leg, i) => (
                  <div key={leg.id} className="flex items-center justify-between text-xs">
                    <span className={clsx('font-medium', leg.positionType === 'BUY' ? 'text-success-600' : 'text-danger-600')}>
                      {leg.positionType} {leg.optionType} {leg.strike.toLocaleString()}
                    </span>
                    <span className="text-dark-500">×{leg.lots} lots</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 p-4 border-t border-dark-200 bg-dark-50 rounded-b-xl">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary gap-2"
              disabled={isSaving || !name.trim()}
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Strategy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}