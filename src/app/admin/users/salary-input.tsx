'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface SalaryInputProps {
  userId: string
  currentSalary: number | null
}

export function SalaryInput({ userId, currentSalary }: SalaryInputProps) {
  const [salary, setSalary] = useState(currentSalary?.toString() || '')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSave = async () => {
    if (!salary) return
    
    setLoading(true)
    setSaved(false)
    
    const { error } = await supabase
      .from('profiles')
      .update({ salary: parseFloat(salary) })
      .eq('id', userId)

    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="flex items-center gap-2">
      <span style={{ color: '#6b7280' }}>$</span>
      <input
        type="number"
        min="0"
        step="1000"
        value={salary}
        onChange={(e) => setSalary(e.target.value)}
        placeholder="50000"
        className="w-28 px-2 py-1.5 text-sm border border-gray-300 focus:border-gray-900 focus:ring-0 transition-colors"
        style={{ background: '#fafafa' }}
      />
      <span className="text-xs" style={{ color: '#6b7280' }}>/yr</span>
      <button
        onClick={handleSave}
        disabled={loading || !salary}
        className="px-3 py-1.5 text-xs font-medium text-white transition-colors disabled:opacity-50"
        style={{ background: '#1a1a2e' }}
      >
        {loading ? '...' : 'Save'}
      </button>
      {saved && (
        <span className="text-xs" style={{ color: '#1a1a2e' }}>✓</span>
      )}
    </div>
  )
}

