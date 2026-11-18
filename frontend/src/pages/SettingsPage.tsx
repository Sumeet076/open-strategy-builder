import { useState } from 'react'
import { Save, User, Bell, Shield, Palette, Database, Globe, Key, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'

interface SettingsSection {
  title: string
  icon: any
  description: string
  render: () => React.ReactNode
}

export function SettingsPage() {
  const [activeSection, setActiveSection] = useState<string>('general')
  const [isSaving, setIsSaving] = useState(false)

  // Settings state
  const [general, setGeneral] = useState({
    theme: 'system' as 'light' | 'dark' | 'system',
    language: 'en',
    timezone: 'Asia/Kolkata',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: 'indian',
  })

  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    pushNotifications: true,
    tradeConfirmations: true,
    dailySummary: true,
    weeklyReport: false,
    priceAlerts: true,
    marginCalls: true,
  })

  const [trading, setTrading] = useState({
    defaultExchange: 'NSE',
    defaultProductType: 'NRML',
    defaultOrderType: 'MARKET',
    defaultLots: 1,
    confirmBeforeExecute: true,
    showGreeksByDefault: true,
    autoRefreshInterval: 30,
    riskWarnings: true,
  })

  const [data, setData] = useState({
    dataProvider: 'mock' as 'mock' | 'nse' | 'truedata' | 'kite',
    apiKey: '',
    apiSecret: '',
    cacheDuration: 30,
    historicalDataPath: '',
    enableWebSocket: true,
  })

  const [appearance, setAppearance] = useState({
    chartTheme: 'light' as 'light' | 'dark',
    colorScheme: 'default' as 'default' | 'tradingview' | 'custom',
    showVolume: true,
    showOI: true,
    compactMode: false,
    fontSize: 'medium' as 'small' | 'medium' | 'large',
  })

  const sections: SettingsSection[] = [
    {
      title: 'General',
      icon: Globe,
      description: 'Application preferences and localization',
      render: () => (
        <div className="space-y-6">
          <div>
            <label className="label">Theme</label>
            <select
              value={general.theme}
              onChange={(e) => setGeneral({ ...general, theme: e.target.value as any })}
              className="input max-w-xs"
            >
              <option value="system">System Default</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Language</label>
              <select
                value={general.language}
                onChange={(e) => setGeneral({ ...general, language: e.target.value })}
                className="input"
              >
                <option value="en">English</option>
                <option value="hi">हिंदी</option>
                <option value="ta">தமிழ்</option>
              </select>
            </div>
            <div>
              <label className="label">Timezone</label>
              <select
                value={general.timezone}
                onChange={(e) => setGeneral({ ...general, timezone: e.target.value })}
                className="input"
              >
                <option value="Asia/Kolkata">India (IST)</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">US Eastern</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Date Format</label>
              <select
                value={general.dateFormat}
                onChange={(e) => setGeneral({ ...general, dateFormat: e.target.value })}
                className="input"
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
            <div>
              <label className="label">Number Format</label>
              <select
                value={general.numberFormat}
                onChange={(e) => setGeneral({ ...general, numberFormat: e.target.value })}
                className="input"
              >
                <option value="indian">Indian (1,00,000)</option>
                <option value="international">International (100,000)</option>
              </select>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Notifications',
      icon: Bell,
      description: 'Configure how you receive alerts and updates',
      render: () => (
        <div className="space-y-4">
          {Object.entries(notifications).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between p-4 bg-dark-50 rounded-lg">
              <div>
                <p className="font-medium text-dark-900 capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                <p className="text-sm text-dark-500">Receive notifications for this event</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => setNotifications({ ...notifications, [key]: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-dark-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: 'Trading',
      icon: Shield,
      description: 'Default trading preferences and risk settings',
      render: () => (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Default Exchange</label>
              <select
                value={trading.defaultExchange}
                onChange={(e) => setTrading({ ...trading, defaultExchange: e.target.value })}
                className="input"
              >
                <option value="NSE">NSE</option>
                <option value="BSE">BSE</option>
                <option value="NFO">NFO</option>
              </select>
            </div>
            <div>
              <label className="label">Default Product Type</label>
              <select
                value={trading.defaultProductType}
                onChange={(e) => setTrading({ ...trading, defaultProductType: e.target.value })}
                className="input"
              >
                <option value="NRML">NRML (Normal)</option>
                <option value="MIS">MIS (Intraday)</option>
                <option value="CNC">CNC (Delivery)</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Default Order Type</label>
              <select
                value={trading.defaultOrderType}
                onChange={(e) => setTrading({ ...trading, defaultOrderType: e.target.value })}
                className="input"
              >
                <option value="MARKET">Market</option>
                <option value="LIMIT">Limit</option>
                <option value="SL">Stop Loss</option>
                <option value="SL-M">Stop Loss Market</option>
              </select>
            </div>
            <div>
              <label className="label">Default Lots</label>
              <input
                type="number"
                value={trading.defaultLots}
                onChange={(e) => setTrading({ ...trading, defaultLots: parseInt(e.target.value) })}
                className="input"
                min="1"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Auto Refresh Interval (seconds)</label>
              <input
                type="number"
                value={trading.autoRefreshInterval}
                onChange={(e) => setTrading({ ...trading, autoRefreshInterval: parseInt(e.target.value) })}
                className="input"
                min="5"
                max="300"
              />
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-dark-50 rounded-lg">
              <div>
                <p className="font-medium text-dark-900">Confirm Before Execute</p>
                <p className="text-sm text-dark-500">Show confirmation dialog before placing orders</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={trading.confirmBeforeExecute}
                  onChange={(e) => setTrading({ ...trading, confirmBeforeExecute: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-dark-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between p-4 bg-dark-50 rounded-lg">
              <div>
                <p className="font-medium text-dark-900">Show Greeks by Default</p>
                <p className="text-sm text-dark-500">Display Greeks panel when opening strategy builder</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={trading.showGreeksByDefault}
                  onChange={(e) => setTrading({ ...trading, showGreeksByDefault: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-dark-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between p-4 bg-dark-50 rounded-lg">
              <div>
                <p className="font-medium text-dark-900">Risk Warnings</p>
                <p className="text-sm text-dark-500">Show warnings for unlimited risk positions</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={trading.riskWarnings}
                  onChange={(e) => setTrading({ ...trading, riskWarnings: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-dark-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Data & API',
      icon: Database,
      description: 'Configure market data sources and API connections',
      render: () => (
        <div className="space-y-6">
          <div>
            <label className="label">Data Provider</label>
            <select
              value={data.dataProvider}
              onChange={(e) => setData({ ...data, dataProvider: e.target.value as any })}
              className="input max-w-xs"
            >
              <option value="mock">Mock Data (Demo)</option>
              <option value="nse">NSE Official</option>
              <option value="truedata">TrueData</option>
              <option value="kite">Zerodha Kite Connect</option>
            </select>
            <p className="text-sm text-dark-500 mt-1">Select your market data source. Mock data is for testing only.</p>
          </div>

          {data.dataProvider !== 'mock' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">API Key</label>
                <input
                  type="password"
                  value={data.apiKey}
                  onChange={(e) => setData({ ...data, apiKey: e.target.value })}
                  className="input"
                  placeholder="Enter API key"
                />
              </div>
              <div>
                <label className="label">API Secret</label>
                <input
                  type="password"
                  value={data.apiSecret}
                  onChange={(e) => setData({ ...data, apiSecret: e.target.value })}
                  className="input"
                  placeholder="Enter API secret"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Cache Duration (seconds)</label>
              <input
                type="number"
                value={data.cacheDuration}
                onChange={(e) => setData({ ...data, cacheDuration: parseInt(e.target.value) })}
                className="input"
                min="5"
                max="300"
              />
            </div>
            <div>
              <label className="label">Historical Data Path</label>
              <input
                type="text"
                value={data.historicalDataPath}
                onChange={(e) => setData({ ...data, historicalDataPath: e.target.value })}
                className="input"
                placeholder="/path/to/historical/data"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-dark-50 rounded-lg">
            <div>
              <p className="font-medium text-dark-900">Enable WebSocket Streaming</p>
              <p className="text-sm text-dark-500">Real-time option chain updates via WebSocket</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={data.enableWebSocket}
                onChange={(e) => setData({ ...data, enableWebSocket: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-dark-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
        </div>
      ),
    },
    {
      title: 'Appearance',
      icon: Palette,
      description: 'Customize charts, colors, and display options',
      render: () => (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Chart Theme</label>
              <select
                value={appearance.chartTheme}
                onChange={(e) => setAppearance({ ...appearance, chartTheme: e.target.value as any })}
                className="input"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
            <div>
              <label className="label">Color Scheme</label>
              <select
                value={appearance.colorScheme}
                onChange={(e) => setAppearance({ ...appearance, colorScheme: e.target.value as any })}
                className="input"
              >
                <option value="default">Default</option>
                <option value="tradingview">TradingView Style</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Font Size</label>
              <select
                value={appearance.fontSize}
                onChange={(e) => setAppearance({ ...appearance, fontSize: e.target.value as any })}
                className="input"
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-dark-50 rounded-lg">
              <div>
                <p className="font-medium text-dark-900">Show Volume</p>
                <p className="text-sm text-dark-500">Display volume bars on charts</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={appearance.showVolume}
                  onChange={(e) => setAppearance({ ...appearance, showVolume: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-dark-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between p-4 bg-dark-50 rounded-lg">
              <div>
                <p className="font-medium text-dark-900">Show Open Interest</p>
                <p className="text-sm text-dark-500">Display OI data on option chain</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={appearance.showOI}
                  onChange={(e) => setAppearance({ ...appearance, showOI: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-dark-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between p-4 bg-dark-50 rounded-lg">
              <div>
                <p className="font-medium text-dark-900">Compact Mode</p>
                <p className="text-sm text-dark-500">Reduce spacing for more data density</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={appearance.compactMode}
                  onChange={(e) => setAppearance({ ...appearance, compactMode: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-dark-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>
        </div>
      ),
    },
  ]

  const handleSave = async () => {
    setIsSaving(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsSaving(false)
    // In real app, save to localStorage or backend
    console.log('Settings saved:', { general, notifications, trading, data, appearance })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-900">Settings</h1>
          <p className="text-dark-500 mt-1">Configure your preferences</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="btn-primary gap-2"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Settings Tabs */}
      <div className="card">
        <div className="flex flex-wrap border-b border-dark-200">
          {sections.map((section) => (
            <button
              key={section.title}
              onClick={() => setActiveSection(section.title.toLowerCase())}
              className={clsx(
                'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                activeSection === section.title.toLowerCase()
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-dark-500 hover:text-dark-700 hover:border-dark-300'
              )}
            >
              <section.icon className="w-4 h-4 inline mr-2" />
              {section.title}
            </button>
          ))}
        </div>

        <div className="p-6">
          <section render={sections.find(s => s.title.toLowerCase() === activeSection)?.render} />
        </div>
      </div>
    </div>
  )
}