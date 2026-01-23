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
      <span className="text-gray-500">$</span>
      <input
        type="number"
        min="0"
        step="0.01"
        value={salary}
        onChange={(e) => setSalary(e.target.value)}
        placeholder="0.00"
        className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      <button
        onClick={handleSave}
        disabled={loading || !salary}
        className="px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? '...' : 'Save'}
      </button>
      {saved && (
        <span className="text-xs text-green-600">✓ Saved</span>
      )}
    </div>
  )
}

