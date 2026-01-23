'use client'

import { useState } from 'react'

interface GenerateXmlButtonProps {
  periodKey: string
  userId: string
  employeeName: string
  totalAdjustedHours: number
}

export function GenerateXmlButton({
  periodKey,
  userId,
  employeeName,
  totalAdjustedHours
}: GenerateXmlButtonProps) {
  const [showModal, setShowModal] = useState(false)
  const [wage, setWage] = useState('')
  const [loading, setLoading] = useState(false)
  const [xmlData, setXmlData] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!wage) return
    
    setLoading(true)
    
    const res = await fetch('/api/generate-period-xml', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        periodKey,
        userId,
        wage: parseFloat(wage)
      }),
    })

    if (res.ok) {
      const data = await res.json()
      setXmlData(data.xml)
    }
    
    setLoading(false)
  }

  const downloadXml = () => {
    if (!xmlData) return
    const blob = new Blob([xmlData], { type: 'application/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dir-${employeeName.replace(/\s+/g, '-').toLowerCase()}-${periodKey}.xml`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalPay = wage ? (totalAdjustedHours * parseFloat(wage)).toFixed(2) : '0.00'

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-4 py-2 text-sm font-medium text-white transition-colors"
        style={{ background: '#1a1a2e' }}
      >
        Generate XML
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 max-w-md w-full mx-4 border border-gray-200">
            <h3 className="text-xl font-light mb-6" style={{ color: '#1a1a2e' }}>
              Generate DIR XML
            </h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#1a1a2e' }}>
                  Employee
                </label>
                <p className="text-sm" style={{ color: '#6b7280' }}>{employeeName}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#1a1a2e' }}>
                  Total Adjusted Hours
                </label>
                <p className="text-sm" style={{ color: '#6b7280' }}>{totalAdjustedHours.toFixed(2)}</p>
              </div>
              
              <div>
                <label htmlFor="wage" className="block text-sm font-medium mb-1" style={{ color: '#1a1a2e' }}>
                  Hourly Wage ($)
                </label>
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
                  <label className="block text-sm font-medium mb-1" style={{ color: '#1a1a2e' }}>
                    Total Pay
                  </label>
                  <p className="text-2xl font-light" style={{ color: '#1a1a2e' }}>${totalPay}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              {!xmlData ? (
                <>
                  <button
                    onClick={handleGenerate}
                    disabled={loading || !wage}
                    className="flex-1 py-2 px-4 text-sm font-medium text-white transition-colors disabled:opacity-50"
                    style={{ background: '#1a1a2e' }}
                  >
                    {loading ? 'Generating...' : 'Generate'}
                  </button>
                  <button
                    onClick={() => setShowModal(false)}
                    className="py-2 px-4 text-sm font-medium border border-gray-300 hover:border-gray-500 transition-colors"
                    style={{ color: '#1a1a2e' }}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={downloadXml}
                    className="flex-1 py-2 px-4 text-sm font-medium text-white transition-colors"
                    style={{ background: '#1a1a2e' }}
                  >
                    Download XML
                  </button>
                  <button
                    onClick={() => { setShowModal(false); setXmlData(null); setWage(''); }}
                    className="py-2 px-4 text-sm font-medium border border-gray-300 hover:border-gray-500 transition-colors"
                    style={{ color: '#1a1a2e' }}
                  >
                    Close
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

