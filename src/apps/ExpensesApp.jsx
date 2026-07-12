import { useState, useMemo, useCallback } from 'react'
import { Plus, Trash2, TrendingUp, TrendingDown, DollarSign, Filter, ArrowUpDown, Wallet } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'

const CATEGORIES = ['Food', 'Transport', 'Entertainment', 'Utilities', 'Shopping', 'Salary', 'Freelance', 'Other']

const CATEGORY_COLORS = {
  Food: '#f87171',
  Transport: '#60a5fa',
  Entertainment: '#a78bfa',
  Utilities: '#fbbf24',
  Shopping: '#f472b6',
  Salary: '#34d399',
  Freelance: '#2dd4bf',
  Other: '#94a3b8',
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(amount))
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getMonthKey(dateStr) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function getMonthLabel(monthKey) {
  const [y, m] = monthKey.split('-')
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export default function ExpensesApp() {
  const [transactions, setTransactions] = useLocalStorage('yp-expenses-data', [])
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState('expense')
  const [category, setCategory] = useState('Food')
  const [filterType, setFilterType] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [sortBy, setSortBy] = useState('date')
  const [sortDir, setSortDir] = useState('desc')
  const [showForm, setShowForm] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  const addTransaction = useCallback(() => {
    const desc = description.trim()
    const amt = parseFloat(amount)
    if (!desc || isNaN(amt) || amt <= 0) return
    const tx = {
      id: generateId(),
      description: desc,
      amount: amt,
      type,
      category,
      date: new Date().toISOString(),
    }
    setTransactions(prev => [tx, ...prev])
    setDescription('')
    setAmount('')
    setType('expense')
    setCategory('Food')
    setShowForm(false)
  }, [description, amount, type, category, setTransactions])

  const deleteTransaction = useCallback((id) => {
    setTransactions(prev => prev.filter(t => t.id !== id))
  }, [setTransactions])

  const summary = useMemo(() => {
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    return { income, expenses, balance: income - expenses }
  }, [transactions])

  const filteredAndSorted = useMemo(() => {
    let list = [...transactions]
    if (filterType !== 'all') list = list.filter(t => t.type === filterType)
    if (filterCategory !== 'all') list = list.filter(t => t.category === filterCategory)
    list.sort((a, b) => {
      if (sortBy === 'date') {
        return sortDir === 'desc'
          ? new Date(b.date).getTime() - new Date(a.date).getTime()
          : new Date(a.date).getTime() - new Date(b.date).getTime()
      }
      return sortDir === 'desc' ? b.amount - a.amount : a.amount - b.amount
    })
    return list
  }, [transactions, filterType, filterCategory, sortBy, sortDir])

  const monthlySummary = useMemo(() => {
    const months = {}
    transactions.forEach(t => {
      const key = getMonthKey(t.date)
      if (!months[key]) months[key] = { income: 0, expenses: 0 }
      if (t.type === 'income') months[key].income += t.amount
      else months[key].expenses += t.amount
    })
    return Object.entries(months)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, data]) => ({ key, label: getMonthLabel(key), ...data, net: data.income - data.expenses }))
  }, [transactions])

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    } else {
      setSortBy(field)
      setSortDir('desc')
    }
  }

  const activeFilters = (filterType !== 'all' ? 1 : 0) + (filterCategory !== 'all' ? 1 : 0)

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Expenses</h1>
            <p className="text-sm text-zinc-500">Track every dollar in and out</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(f => !f)}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-light text-white rounded-xl text-sm font-medium transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Transaction
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 stagger-children">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-success" />
            </div>
            <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Income</span>
          </div>
          <p className="text-xl font-bold text-success font-mono">{formatCurrency(summary.income)}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-danger/10 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-danger" />
            </div>
            <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Expenses</span>
          </div>
          <p className="text-xl font-bold text-danger font-mono">{formatCurrency(summary.expenses)}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-accent" />
            </div>
            <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Balance</span>
          </div>
          <p className={`text-xl font-bold font-mono ${summary.balance >= 0 ? 'text-success' : 'text-danger'}`}>
            {summary.balance < 0 ? '−' : ''}{formatCurrency(summary.balance)}
          </p>
        </div>
      </div>

      {/* Add Transaction Form */}
      {showForm && (
        <div className="card p-5 mb-6 animate-scale-in">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">New Transaction</h3>

          {/* Type Toggle */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setType('expense')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                type === 'expense'
                  ? 'bg-danger/15 text-danger border border-danger/30'
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-zinc-200'
              }`}
            >
              <TrendingDown className="w-4 h-4 inline mr-1.5 -mt-0.5" />
              Expense
            </button>
            <button
              onClick={() => setType('income')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                type === 'income'
                  ? 'bg-success/15 text-success border border-success/30'
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-zinc-200'
              }`}
            >
              <TrendingUp className="w-4 h-4 inline mr-1.5 -mt-0.5" />
              Income
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTransaction()}
              placeholder="Description"
              className="px-4 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-100 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-accent transition-colors"
              autoFocus
            />
            <div className="relative">
              <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTransaction()}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full pl-9 pr-4 py-2.5 bg-zinc-900 border border-zinc-700 rounded-xl text-zinc-100 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-accent transition-colors font-mono"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="text-xs text-zinc-500 mb-1.5 block">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    category === cat
                      ? 'ring-2 ring-accent text-zinc-100'
                      : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                  style={category === cat ? { backgroundColor: CATEGORY_COLORS[cat] + '25', color: CATEGORY_COLORS[cat] } : undefined}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={addTransaction}
              disabled={!description.trim() || !amount || parseFloat(amount) <= 0}
              className="px-5 py-2 bg-accent hover:bg-accent-light disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors cursor-pointer"
            >
              Add {type === 'income' ? 'Income' : 'Expense'}
            </button>
          </div>
        </div>
      )}

      {/* Filters & Sort */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setShowFilters(f => !f)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors cursor-pointer ${
            showFilters || activeFilters > 0
              ? 'bg-accent/10 text-accent border border-accent/30'
              : 'bg-zinc-800/80 text-zinc-400 border border-zinc-700 hover:text-zinc-200'
          }`}
        >
          <Filter className="w-4 h-4" />
          Filters
          {activeFilters > 0 && (
            <span className="w-5 h-5 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center">
              {activeFilters}
            </span>
          )}
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => toggleSort('date')}
            className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
              sortBy === 'date' ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Date
            {sortBy === 'date' && <ArrowUpDown className="w-3 h-3" />}
          </button>
          <button
            onClick={() => toggleSort('amount')}
            className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
              sortBy === 'amount' ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Amount
            {sortBy === 'amount' && <ArrowUpDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="card p-4 mb-4 animate-scale-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-zinc-500 mb-1.5 block">Type</label>
              <div className="flex gap-2">
                {['all', 'income', 'expense'].map(t => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      filterType === t
                        ? 'bg-accent/15 text-accent border border-accent/30'
                        : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1.5 block">Category</label>
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-accent transition-colors"
              >
                <option value="all">All Categories</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          {activeFilters > 0 && (
            <button
              onClick={() => { setFilterType('all'); setFilterCategory('all') }}
              className="mt-3 text-xs text-accent hover:text-accent-light transition-colors cursor-pointer"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Transaction List */}
      <div className="card overflow-hidden mb-6">
        {filteredAndSorted.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">
              {transactions.length === 0 ? 'No transactions yet. Add one to get started!' : 'No transactions match your filters.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {filteredAndSorted.map(tx => (
              <div key={tx.id} className="flex items-center gap-3 px-4 py-3 group hover:bg-zinc-800/30 transition-colors">
                {/* Type Indicator */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  tx.type === 'income' ? 'bg-success/10' : 'bg-danger/10'
                }`}>
                  {tx.type === 'income'
                    ? <TrendingUp className="w-4 h-4 text-success" />
                    : <TrendingDown className="w-4 h-4 text-danger" />
                  }
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-200 truncate">{tx.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-zinc-500">{formatDate(tx.date)}</span>
                    <span
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded-md"
                      style={{
                        backgroundColor: CATEGORY_COLORS[tx.category] + '18',
                        color: CATEGORY_COLORS[tx.category],
                      }}
                    >
                      {tx.category}
                    </span>
                  </div>
                </div>

                {/* Amount */}
                <span className={`text-sm font-bold font-mono flex-shrink-0 ${
                  tx.type === 'income' ? 'text-success' : 'text-danger'
                }`}>
                  {tx.type === 'income' ? '+' : '−'}{formatCurrency(tx.amount)}
                </span>

                {/* Delete */}
                <button
                  onClick={() => deleteTransaction(tx.id)}
                  className="p-1.5 rounded-lg text-zinc-600 hover:text-danger hover:bg-danger/10 opacity-0 group-hover:opacity-100 transition-all cursor-pointer flex-shrink-0"
                  aria-label={`Delete ${tx.description}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Monthly Breakdown */}
      {monthlySummary.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-zinc-500" />
            Monthly Breakdown
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 stagger-children">
            {monthlySummary.map(month => {
              const maxVal = Math.max(month.income, month.expenses, 1)
              return (
                <div key={month.key} className="card p-4">
                  <p className="text-sm font-medium text-zinc-200 mb-3">{month.label}</p>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-success">Income</span>
                        <span className="text-success font-mono">{formatCurrency(month.income)}</span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-success rounded-full transition-all duration-500"
                          style={{ width: `${(month.income / maxVal) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-danger">Expenses</span>
                        <span className="text-danger font-mono">{formatCurrency(month.expenses)}</span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-danger rounded-full transition-all duration-500"
                          style={{ width: `${(month.expenses / maxVal) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-zinc-800 flex justify-between items-center">
                    <span className="text-xs text-zinc-500">Net</span>
                    <span className={`text-sm font-bold font-mono ${month.net >= 0 ? 'text-success' : 'text-danger'}`}>
                      {month.net < 0 ? '−' : '+'}{formatCurrency(month.net)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
