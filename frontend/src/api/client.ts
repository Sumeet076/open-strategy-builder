import axios, { AxiosInstance, AxiosError } from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    })

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = localStorage.getItem('auth_token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Handle unauthorized
          localStorage.removeItem('auth_token')
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }
    )
  }

  // Market Data
  async getOptionChain(underlying: string, exchange: string, expiryDate: string, strikeCount: number = 20) {
    const response = await this.client.get('/market/option-chain', {
      params: { underlying, exchange, expiry_date: expiryDate, strike_count: strikeCount },
    })
    return response.data
  }

  async getUnderlyingQuote(underlying: string, exchange: string) {
    const response = await this.client.get('/market/underlying-quote', {
      params: { underlying, exchange },
    })
    return response.data
  }

  async getExpiries(underlying: string, exchange: string) {
    const response = await this.client.get('/market/expiries', {
      params: { underlying, exchange },
    })
    return response.data
  }

  // Strategies
  async saveStrategy(strategy: any) {
    const response = await this.client.post('/strategies', strategy)
    return response.data
  }

  async getStrategies() {
    const response = await this.client.get('/strategies')
    return response.data
  }

  async getStrategy(id: string) {
    const response = await this.client.get(`/strategies/${id}`)
    return response.data
  }

  async updateStrategy(id: string, strategy: any) {
    const response = await this.client.put(`/strategies/${id}`, strategy)
    return response.data
  }

  async deleteStrategy(id: string) {
    const response = await this.client.delete(`/strategies/${id}`)
    return response.data
  }

  // Analytics
  async calculatePayoff(data: any) {
    const response = await this.client.post('/analytics/payoff', data)
    return response.data
  }

  async calculateGreeks(data: any) {
    const response = await this.client.post('/analytics/greeks', data)
    return response.data
  }

  async scenarioAnalysis(data: any) {
    const response = await this.client.post('/analytics/scenario', data)
    return response.data
  }

  // Templates
  async getTemplates(category?: string, marketView?: string) {
    const response = await this.client.get('/templates', {
      params: { category, market_view: marketView },
    })
    return response.data
  }

  async getTemplate(id: string) {
    const response = await this.client.get(`/templates/${id}`)
    return response.data
  }

  async generateFromTemplate(data: any) {
    const response = await this.client.post('/templates/generate', data)
    return response.data
  }

  // Backtesting
  async runBacktest(data: any) {
    const response = await this.client.post('/backtest', data)
    return response.data
  }

  // Execution
  async executeStrategy(data: { strategyId: string; mode: 'PAPER' | 'LIVE' }) {
    const response = await this.client.post('/execution/execute', data)
    return response.data
  }
}

export const api = new ApiClient()