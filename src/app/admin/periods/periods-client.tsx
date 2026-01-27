'use client'

import { useState } from 'react'
import { STATUS_LABELS, formatPayPeriodLabel, getPayPeriodKey, calculateAdjustedPay, calculateCACCost } from '@/lib/types'
import type { Profile, Ticket, EmployeePeriod, EmployeePeriodStatus } from '@/lib/types'

interface EmployeeData {
  profile: Profile
  tickets: Ticket[]
  totalHours: number
  totalAdjustedPay: number | null  // null means salary not set
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
  const [showWageModal, setShowWageModal] = useState<{ periodKey: string; userId: string; employeeName: string; totalAdjustedPay: number | null; yearlySalary: number | null } | null>(null)
  const [loading, setLoading] = useState(false)

  // Check/payroll input fields
  const [checkNumber, setCheckNumber] = useState('')
  const [federalTax, setFederalTax] = useState('')
  const [fica, setFica] = useState('')
  const [stateTax, setStateTax] = useState('')
  const [sdi, setSdi] = useState('')
  const [savings, setSavings] = useState('')
  const [total, setTotal] = useState('')
  const [grossWages, setGrossWages] = useState('')

  // Reset form fields when modal closes
  const resetFormFields = () => {
    setCheckNumber('')
    setFederalTax('')
    setFica('')
    setStateTax('')
    setSdi('')
    setSavings('')
    setTotal('')
    setGrossWages('')
  }

  // Calculate hourly wage from yearly salary (2080 hours/year = 40 hrs/week × 52 weeks)
  const hourlyWage = showWageModal?.yearlySalary ? showWageModal.yearlySalary / 2080 : 0

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
    if (!showWageModal || !showWageModal.yearlySalary) return
    setLoading(true)

    const res = await fetch('/api/generate-period-xml', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        periodKey: showWageModal.periodKey,
        userId: showWageModal.userId,
        yearlySalary: showWageModal.yearlySalary,
        checkNumber,
        federalTax: parseFloat(federalTax) || 0,
        fica: parseFloat(fica) || 0,
        stateTax: parseFloat(stateTax) || 0,
        sdi: parseFloat(sdi) || 0,
        savings: parseFloat(savings) || 0,
        total: parseFloat(total) || 0,
        grossWages: parseFloat(grossWages) || 0
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
    resetFormFields()
    setLoading(false)
    window.location.reload()
  }

  // Helper to format adjusted pay display
  const formatAdjustedPay = (amount: number | null): string => {
    if (amount === null) return 'Pending Salary'
    return `$${amount.toFixed(2)}`
  }

  // Calculate period total adjusted pay (only for employees with salary set)
  const getPeriodTotalAdjustedPay = (employees: EmployeeData[]): number | null => {
    const hasMissingSalary = employees.some(e => e.totalAdjustedPay === null)
    if (hasMissingSalary) return null
    return employees.reduce((sum, e) => sum + (e.totalAdjustedPay || 0), 0)
  }

  // Calculate period total CAC cost (sum of all employees' hours × $0.80)
  const getPeriodTotalCAC = (employees: EmployeeData[]): number => {
    return employees.reduce((sum, e) => sum + calculateCACCost(e.totalHours), 0)
  }

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
              <div className="text-right flex items-center gap-6">
                <div>
                  <span className="text-sm font-medium" style={{ color: '#1a1a2e' }}>
                    ${getPeriodTotalCAC(period.employees).toFixed(2)}
                  </span>
                  <span className="text-sm ml-1" style={{ color: '#6b7280' }}>CAC</span>
                </div>
                <div>
                  {(() => {
                    const total = getPeriodTotalAdjustedPay(period.employees)
                    return total === null ? (
                      <span className="text-sm" style={{ color: '#dc2626' }}>Pending Salary Info</span>
                    ) : (
                      <>
                        <span className="text-lg font-medium" style={{ color: '#1a1a2e' }}>
                          ${total.toFixed(2)}
                        </span>
                        <span className="text-sm ml-2" style={{ color: '#6b7280' }}>adjusted pay</span>
                      </>
                    )
                  })()}
                </div>
              </div>
            </button>

            {/* Period Content - Employees */}
            {expandedPeriods.has(period.key) && (
              <div className="border-t border-gray-200">
                {period.employees.map(emp => {
                  const empKey = `${period.key}-${emp.profile.id}`
                  const isCompleted = emp.periodStatus === 'ready_for_dir'
                  const isAwaitingPay = emp.periodStatus === 'awaiting_pay'
                  return (
                    <div key={empKey} className="border-b border-gray-100 last:border-b-0">
                      {/* Employee Row */}
                      <div
                        className="flex items-center justify-between p-4 pl-12 transition-colors"
                        style={{
                          background: isCompleted ? '#e8f5e9' : isAwaitingPay ? '#fef8e0ff' : undefined,
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
                          <span className="text-sm" style={{ color: emp.totalAdjustedPay === null ? '#dc2626' : (isCompleted ? '#4a7c59' : '#6b7280') }}>
                            {emp.totalAdjustedPay === null ? 'Pending Salary' : `$${emp.totalAdjustedPay.toFixed(2)} adj pay`}
                          </span>
                          <span className="text-sm" style={{ color: isCompleted ? '#4a7c59' : '#6b7280' }}>
                            ${calculateCACCost(emp.totalHours).toFixed(2)} CAC
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
                              <span className="text-xs" style={{ color: '#6b7280' }}>
                                Current: {STATUS_LABELS[emp.periodStatus]}
                              </span>
                              <button
                                onClick={() => updateStatus(period.key, emp.profile.id, 'awaiting_pay')}
                                disabled={loading}
                                className="px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 hover:opacity-80"
                                style={{ background: '#e0f2fe', color: '#0369a1' }}
                              >
                                Mark Awaiting Pay
                              </button>
                            </>
                          )}

                          {emp.periodStatus === 'awaiting_pay' && (
                            <>
                              <span className="text-xs" style={{ color: '#6b7280' }}>
                                Current: {STATUS_LABELS[emp.periodStatus]}
                              </span>
                              <button
                                onClick={() => setShowWageModal({
                                  periodKey: period.key,
                                  userId: emp.profile.id,
                                  employeeName: emp.profile.full_name || emp.profile.email,
                                  totalAdjustedPay: emp.totalAdjustedPay,
                                  yearlySalary: emp.profile.salary
                                })}
                                className="px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-80"
                                style={{ background: '#e0f2fe', color: '#0369a1' }}
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
                                <th className="pb-2 font-medium text-right">Adjusted Pay</th>
                              </tr>
                            </thead>
                            <tbody>
                              {emp.tickets.map(ticket => {
                                const ticketAdjustedPay = calculateAdjustedPay(Number(ticket.hours_worked), emp.profile.salary)
                                return (
                                  <tr key={ticket.id}>
                                    <td className="py-1" style={{ color: '#1a1a2e' }}>
                                      {new Date(ticket.date_worked).toLocaleDateString()}
                                    </td>
                                    <td className="py-1" style={{ color: '#1a1a2e' }}>{ticket.dir_number}</td>
                                    <td className="py-1" style={{ color: '#6b7280' }}>{ticket.project_title}</td>
                                    <td className="py-1 text-right" style={{ color: '#6b7280' }}>{ticket.hours_worked}</td>
                                    <td className="py-1 text-right font-medium" style={{ color: ticketAdjustedPay === null ? '#dc2626' : '#1a1a2e' }}>
                                      {ticketAdjustedPay === null ? 'Pending' : `$${ticketAdjustedPay.toFixed(2)}`}
                                    </td>
                                  </tr>
                                )
                              })}
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
          <div className="bg-white p-8 max-w-lg w-full mx-4 border border-gray-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-light mb-6" style={{ color: '#1a1a2e' }}>
              Generate DIR XML
            </h3>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#1a1a2e' }}>Employee</label>
                <p className="text-sm" style={{ color: '#6b7280' }}>{showWageModal.employeeName}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1a1a2e' }}>Yearly Salary</label>
                  <p className="text-sm" style={{ color: showWageModal.yearlySalary ? '#6b7280' : '#dc2626' }}>
                    {showWageModal.yearlySalary ? `$${showWageModal.yearlySalary.toLocaleString()}/yr` : 'Not set'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1a1a2e' }}>Hourly Rate</label>
                  <p className="text-sm" style={{ color: '#6b7280' }}>
                    {hourlyWage ? `$${hourlyWage.toFixed(2)}/hr` : '—'}
                  </p>
                </div>
              </div>

              {showWageModal.totalAdjustedPay !== null && (
                <div className="pt-4 border-t border-gray-200">
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1a1a2e' }}>Total Adjusted Pay</label>
                  <p className="text-2xl font-light" style={{ color: '#1a1a2e' }}>${showWageModal.totalAdjustedPay.toFixed(2)}</p>
                </div>
              )}

              {/* Check/Payroll Information */}
              <div className="pt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium mb-3" style={{ color: '#1a1a2e' }}>Check Information</h4>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#6b7280' }}>Check Number</label>
                    <input
                      type="text"
                      value={checkNumber}
                      onChange={(e) => setCheckNumber(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 focus:outline-none focus:border-gray-500"
                      placeholder="Enter check number"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: '#6b7280' }}>Gross Wages</label>
                      <input
                        type="number"
                        step="0.01"
                        value={grossWages}
                        onChange={(e) => setGrossWages(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 focus:outline-none focus:border-gray-500"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: '#6b7280' }}>Federal Tax</label>
                      <input
                        type="number"
                        step="0.01"
                        value={federalTax}
                        onChange={(e) => setFederalTax(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 focus:outline-none focus:border-gray-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: '#6b7280' }}>FICA (Social Security)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={fica}
                        onChange={(e) => setFica(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 focus:outline-none focus:border-gray-500"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: '#6b7280' }}>State Tax</label>
                      <input
                        type="number"
                        step="0.01"
                        value={stateTax}
                        onChange={(e) => setStateTax(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 focus:outline-none focus:border-gray-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: '#6b7280' }}>SDI</label>
                      <input
                        type="number"
                        step="0.01"
                        value={sdi}
                        onChange={(e) => setSdi(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 focus:outline-none focus:border-gray-500"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: '#6b7280' }}>Savings</label>
                      <input
                        type="number"
                        step="0.01"
                        value={savings}
                        onChange={(e) => setSavings(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 focus:outline-none focus:border-gray-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#6b7280' }}>Total (Net Pay)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={total}
                      onChange={(e) => setTotal(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 focus:outline-none focus:border-gray-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleGenerateXml}
                disabled={loading || !showWageModal.yearlySalary}
                className="flex-1 py-2 px-4 text-sm font-medium text-white transition-colors disabled:opacity-50"
                style={{ background: '#1a1a2e' }}
              >
                {loading ? 'Generating...' : 'Generate & Download'}
              </button>
              <button
                onClick={() => { setShowWageModal(null); resetFormFields(); }}
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

