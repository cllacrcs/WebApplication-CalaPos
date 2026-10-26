
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestDatabase() {
  const [status, setStatus] = useState('Mengecek koneksi...')

  useEffect(() => {
    async function checkDatabase() {
      const { error } = await supabase
        .from('products')
        .select('id')
        .limit(1)

      if (error) {
        setStatus(`Gagal: ${error.message}`)
      } else {
        setStatus('Koneksi berhasil! Tabel products dapat diakses.')
      }
    }

    checkDatabase()
  }, [])

  return (
    <main style={{ padding: 24, fontFamily: 'Arial' }}>
      <h1>Tes Koneksi CalaPOS</h1>
      <p>{status}</p>
    </main>
  )
}
