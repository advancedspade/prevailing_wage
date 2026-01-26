'use client'

import { useState } from 'react'
import { STATUS_LABELS, formatPayPeriodLabel, getPayPeriodKey } from '@/lib/types'
import type { Profile, Ticket, EmployeePeriod, EmployeePeriodStatus } from '@/lib/types'

interface EmployeeData {
  profile: Profile
  tickets: Ticket[]
  totalHours: number
  totalAdjustedHours: number
  periodStatus: EmployeePeriodStatus
  employeePeriodId?: string
  hourlyWage?: number | null
}

interface PeriodData {
  key: string
  label: string
  year: number
  month: number
  period: 1 | 2
  employees: EmployeeData[]
}

interface PeriodsClientProps {
  periods: PeriodData[]
}

export function PeriodsClient({ periods }: PeriodsClientProps) {
  const [expandedPeriods, setExpandedPeriods] = useState<Set<string>>(new Set([periods[0]?.key]))
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set())
  const [showWageModal, setShowWageModal] = useState<{ periodKey: string; userId: string; employeeName: string; totalAdjustedHours: number } | null>(null)
  const [wage, setWage] = useState('')
  const [loading, setLoading] = useState(false)

  const togglePeriod = (key: string) => {
    setExpandedPeriods(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleEmployee = (key: string) => {
    setExpandedEmployees(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const updateStatus = async (periodKey: string, userId: string, newStatus: EmployeePeriodStatus) => {
    setLoading(true)
    await fetch('/api/update-employee-period', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ periodKey, userId, status: newStatus })
    })
    window.location.reload()
  }

  const handleGenerateXml = async () => {
    if (!showWageModal || !wage) return
    setLoading(true)
    
    const res = await fetch('/api/generate-period-xml', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        periodKey: showWageModal.periodKey,
        userId: showWageModal.userId,
        wage: parseFloat(wage)
      })
    })

    if (res.ok) {
      const data = await res.json()
      const blob = new Blob([data.xml], { type: 'application/xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `dir-${showWageModal.employeeName.replace(/\s+/g, '-').toLowerCase()}-${showWageModal.periodKey}.xml`
      a.click()
      URL.revokeObjectURL(url)
    }
    
    setShowWageModal(null)
    setWage('')
    setLoading(false)
    window.location.reload()
  }

  const totalPay = showWageModal && wage ? (showWageModal.totalAdjustedHours * parseFloat(wage)).toFixed(2) : '0.00'

  return (
    <div className="space-y-4">
      {periods.length === 0 ? (
        <div className="bg-white border border-gray-200 text-center py-16">
          <p style={{ color: '#6b7280' }}>No tickets submitted yet</p>
        </div>
      ) : (
        periods.map(period => (
          <div key={period.key} className="bg-white border border-gray-200">
            {/* Period Header */}
            <button
              onClick={() => togglePeriod(period.key)}
              className="w-full p-4 flex justify-between items-center hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg" style={{ color: '#6b7280' }}>
                  {expandedPeriods.has(period.key) ? '▼' : '▶'}
                </span>
                <h3 className="text-lg font-medium" style={{ color: '#1a1a2e' }}>
                  {period.label}
                </h3>
                <span className="text-sm" style={{ color: '#6b7280' }}>
                  {period.employees.length} employee{period.employees.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="text-right">
                <span className="text-lg font-medium" style={{ color: '#1a1a2e' }}>
                  {period.employees.reduce((sum, e) => sum + e.totalAdjustedHours, 0).toFixed(2)}
                </span>
                <span className="text-sm ml-2" style={{ color: '#6b7280' }}>adjusted hrs</span>
              </div>
            </button>

            {/* Period Content - Employees */}
            {expandedPeriods.has(period.key) && (
              <div className="border-t border-gray-200">
                {period.employees.map(emp => {
                  const empKey = `${period.key}-${emp.profile.id}`
                  const isCompleted = emp.periodStatus === 'ready_for_dir'
                  return (
                    <div key={empKey} className="border-b border-gray-100 last:border-b-0">
                      {/* Employee Row */}
                      <div
                        className="flex items-center justify-between p-4 pl-12 transition-colors"
                        style={{
                          background: isCompleted ? '#e8f5e9' : undefined,
                        }}
                      >
                        <button
                          onClick={() => toggleEmployee(empKey)}
                          className="flex items-center gap-3 text-left flex-1 hover:opacity-70"
                        >
                          <span style={{ color: isCompleted ? '#4a7c59' : '#6b7280' }}>
                            {expandedEmployees.has(empKey) ? '▼' : '▶'}
                          </span>
                          <span className="font-medium" style={{ color: isCompleted ? '#2e5a3a' : '#1a1a2e' }}>
                            {emp.profile.full_name || emp.profile.email}
                          </span>
                          <span className="text-sm" style={{ color: isCompleted ? '#4a7c59' : '#6b7280' }}>
                            {emp.totalAdjustedHours.toFixed(2)} adj hrs
                          </span>
                          {isCompleted && (
                            <span className="text-sm font-medium" style={{ color: '#2e7d32' }}>
                              ✓ Completed
                            </span>
                          )}
                        </button>

                        {/* Status + Actions */}
                        <div className="flex items-center gap-3">
                          {emp.periodStatus === 'pending' && (
                            <>
                              <span className="px-2 py-1 text-xs font-medium border" style={{ color: '#1a1a2e', borderColor: '#d1d1d1' }}>
                                {STATUS_LABELS[emp.periodStatus]}
                              </span>
                              <button
                                onClick={() => updateStatus(period.key, emp.profile.id, 'awaiting_pay')}
                                disabled={loading}
                                className="px-3 py-1.5 text-xs font-medium border border-gray-300 hover:border-gray-500 transition-colors disabled:opacity-50"
                                style={{ color: '#1a1a2e' }}
                              >
                                Mark Awaiting Pay
                              </button>
                            </>
                          )}

                          {emp.periodStatus === 'awaiting_pay' && (
                            <>
                              <span className="px-2 py-1 text-xs font-medium border" style={{ color: '#1a1a2e', borderColor: '#d1d1d1' }}>
                                {STATUS_LABELS[emp.periodStatus]}
                              </span>
                              <button
                                onClick={() => setShowWageModal({
                                  periodKey: period.key,
                                  userId: emp.profile.id,
                                  employeeName: emp.profile.full_name || emp.profile.email,
                                  totalAdjustedHours: emp.totalAdjustedHours
                                })}
                                className="px-3 py-1.5 text-xs font-medium text-white transition-colors"
                                style={{ background: '#1a1a2e' }}
                              >
                                Ready for DIR
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Expanded Ticket Details */}
                      {expandedEmployees.has(empKey) && (
                        <div className="bg-gray-50 border-t border-gray-100 pl-20 pr-4 py-3">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left" style={{ color: '#6b7280' }}>
                                <th className="pb-2 font-medium">Date</th>
                                <th className="pb-2 font-medium">DIR #</th>
                                <th className="pb-2 font-medium">Project</th>
                                <th className="pb-2 font-medium text-right">Hours</th>
                                <th className="pb-2 font-medium text-right">Adjusted</th>
                              </tr>
                            </thead>
                            <tbody>
                              {emp.tickets.map(ticket => (
                                <tr key={ticket.id}>
                                  <td className="py-1" style={{ color: '#1a1a2e' }}>
                                    {new Date(ticket.date_worked).toLocaleDateString()}
                                  </td>
                                  <td className="py-1" style={{ color: '#1a1a2e' }}>{ticket.dir_number}</td>
                                  <td className="py-1" style={{ color: '#6b7280' }}>{ticket.project_title}</td>
                                  <td className="py-1 text-right" style={{ color: '#6b7280' }}>{ticket.hours_worked}</td>
                                  <td className="py-1 text-right font-medium" style={{ color: '#1a1a2e' }}>
                                    {(Number(ticket.hours_worked) * 1.25).toFixed(2)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))
      )}

      {/* Wage Entry Modal */}
      {showWageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 max-w-md w-full mx-4 border border-gray-200">
            <h3 className="text-xl font-light mb-6" style={{ color: '#1a1a2e' }}>
              Generate DIR XML
            </h3>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#1a1a2e' }}>Employee</label>
                <p className="text-sm" style={{ color: '#6b7280' }}>{showWageModal.employeeName}</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#1a1a2e' }}>Total Adjusted Hours</label>
                <p className="text-sm" style={{ color: '#6b7280' }}>{showWageModal.totalAdjustedHours.toFixed(2)}</p>
              </div>

              <div>
                <label htmlFor="wage" className="block text-sm font-medium mb-1" style={{ color: '#1a1a2e' }}>Hourly Wage ($)</label>
                <input
                  id="wage"
                  type="number"
                  min="0"
                  step="0.01"
                  value={wage}
                  onChange={(e) => setWage(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 focus:border-gray-900 focus:ring-0 transition-colors"
                  style={{ background: '#fafafa' }}
                />
              </div>

              {wage && (
                <div className="pt-4 border-t border-gray-200">
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1a1a2e' }}>Total Pay</label>
                  <p className="text-2xl font-light" style={{ color: '#1a1a2e' }}>${totalPay}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleGenerateXml}
                disabled={loading || !wage}
                className="flex-1 py-2 px-4 text-sm font-medium text-white transition-colors disabled:opacity-50"
                style={{ background: '#1a1a2e' }}
              >
                {loading ? 'Generating...' : 'Generate & Download'}
              </button>
              <button
                onClick={() => { setShowWageModal(null); setWage(''); }}
                className="py-2 px-4 text-sm font-medium border border-gray-300 hover:border-gray-500 transition-colors"
                style={{ color: '#1a1a2e' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

