import { X, Search, Filter, ChevronDown } from 'lucide-react'
import { clsx } from 'clsx'
import { StrategyTemplate, StrategyCategory, MarketView } from '../../types'

interface StrategyTemplatesDialogProps {
  isOpen: boolean
  onClose: () => void
  templates: StrategyTemplate[]
  onSelect: (template: StrategyTemplate) => void
  atmStrike: number
}

const CATEGORIES: { value: StrategyCategory; label: string; icon: string }[] = [
  { value: 'DIRECTIONAL', label: 'Directional', icon: '↗️' },
  { value: 'NON_DIRECTIONAL', label: 'Non-Directional', icon: '↔️' },
  { value: 'VOLATILITY', label: 'Volatility', icon: '📊' },
  { value: 'INCOME', label: 'Income', icon: '💰' },
  { value: 'HEDGING', label: 'Hedging', icon: '🛡️' },
]

const MARKET_VIEWS: { value: MarketView; label: string; color: string }[] = [
  { value: 'BULLISH', label: 'Bullish', color: 'text-success-600' },
  { value: 'BEARISH', label: 'Bearish', color: 'text-danger-600' },
  { value: 'NEUTRAL', label: 'Neutral', color: 'text-primary-600' },
  { value: 'VOLATILE', label: 'Volatile', color: 'text-purple-600' },
  { value: 'RANGE_BOUND', label: 'Range Bound', color: 'text-orange-600' },
]

export function StrategyTemplatesDialog({ isOpen, onClose, templates, onSelect, atmStrike }: StrategyTemplatesDialogProps) {
  if (!isOpen) return null

  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<StrategyCategory | 'ALL'>('ALL')
  const [selectedView, setSelectedView] = useState<MarketView | 'ALL'>('ALL')

  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase())
      const matchesCategory = selectedCategory === 'ALL' || t.category === selectedCategory
      const matchesView = selectedView === 'ALL' || t.market_view === selectedView
      return matchesSearch && matchesCategory && matchesView
    })
  }, [templates, search, selectedCategory, selectedView])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-200 sticky top-0 bg-white z-10">
          <h3 className="text-lg font-semibold text-dark-900">Strategy Templates</h3>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-dark-100 text-dark-500">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-dark-200 bg-dark-50 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates..."
              className="input pl-10"
            />
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            <Filter className="w-4 h-4 text-dark-400 mt-0.5" />
            <div className="flex flex-wrap gap-2">
              {['ALL', ...CATEGORIES.map(c => c.value)].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat as any)}
                  className={clsx(
                    'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                    selectedCategory === cat
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-dark-600 hover:bg-dark-100 border border-dark-200'
                  )}
                >
                  {cat === 'ALL' ? 'All' : CATEGORIES.find(c => c.value === cat)?.label}
                </button>
              ))}
            </div>
          </div>

          {/* Market View Filter */}
          <div className="flex flex-wrap gap-2">
            <div className="flex flex-wrap gap-2">
              {['ALL', ...MARKET_VIEWS.map(v => v.value)].map((view) => (
                <button
                  key={view}
                  onClick={() => setSelectedView(view as any)}
                  className={clsx(
                    'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                    selectedView === view
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-dark-600 hover:bg-dark-100 border border-dark-200'
                  )}
                >
                  {view === 'ALL' ? 'All Views' : MARKET_VIEWS.find(v => v.value === view)?.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Templates Grid */}
        <div className="flex-1 overflow-auto p-4">
          {filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-dark-500">
              <Search className="w-12 h-12 mb-3 opacity-50" />
              <p>No templates found matching your filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  atmStrike={atmStrike}
                  onSelect={() => {
                    onSelect(template)
                    onClose()
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TemplateCard({ template, atmStrike, onSelect }: { template: StrategyTemplate; atmStrike: number; onSelect: () => void }) {
  const categoryInfo = CATEGORIES.find(c => c.value === template.category)
  const viewInfo = MARKET_VIEWS.find(v => v.value === template.market_view)

  return (
    <button
      onClick={onSelect}
      className="card p-4 hover:shadow-md transition-shadow cursor-pointer border-2 border-transparent hover:border-primary-200"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-semibold text-dark-900">{template.name}</h4>
          <p className="text-sm text-dark-500 mt-1 line-clamp-2">{template.description}</p>
        </div>
        <span className="text-2xl">{categoryInfo?.icon}</span>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className={clsx('badge text-xs', viewInfo?.color.replace('text-', 'bg-').replace('600', '50') + ' ' + viewInfo?.color.replace('text-', 'text-'))}>
          {viewInfo?.label}
        </span>
        <span className="badge badge-neutral text-xs">{template.category.replace('_', ' ')}</span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-dark-600">
          <span>Legs:</span>
          <span className="font-mono font-medium">{template.legs.length}</span>
        </div>
        {template.min_capital && (
          <div className="flex justify-between text-dark-600">
            <span>Min Capital:</span>
            <span className="font-mono font-medium">₹{template.min_capital.toLocaleString()}</span>
          </div>
        )}
        {template.max_risk && (
          <div className="flex justify-between text-dark-600">
            <span>Max Risk:</span>
            <span className="font-mono font-medium text-danger-600">
              {template.max_risk >= 5 ? 'Unlimited' : `${template.max_risk}x premium`}
            </span>
          </div>
        )}
        {template.typical_iv_range && (
          <div className="flex justify-between text-dark-600">
            <span>IV Range:</span>
            <span className="font-mono font-medium">
              {(template.typical_iv_range[0] * 100).toFixed(0)}% - {(template.typical_iv_range[1] * 100).toFixed(0)}%
            </span>
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-dark-200 flex items-center justify-between">
        <span className="text-xs text-dark-500">
          ATM: {atmStrike.toLocaleString()} | Strikes auto-calculated
        </span>
        <span className="btn-primary text-sm px-3 py-1.5">Use Template</span>
      </div>
    </button>
  )
}
