import { Routes, Route } from 'react-router-dom'
import { StrategyBuilder } from './pages/StrategyBuilder'
import { Dashboard } from './pages/Dashboard'
import { BacktestPage } from './pages/BacktestPage'
import { SettingsPage } from './pages/SettingsPage'
import { Layout } from './components/Layout'
import { Toaster } from './components/ui/Toaster'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/builder" element={<StrategyBuilder />} />
        <Route path="/backtest" element={<BacktestPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
      <Toaster />
    </Layout>
  )
}

export default App