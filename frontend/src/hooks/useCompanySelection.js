/**
 * useCompanySelection — Hook compartido para selección de empresa
 * 
 * - Persiste la empresa seleccionada en localStorage
 * - Se mantiene al cambiar de página
 * - Si la empresa guardada ya no existe, cae al [0]
 */
import { useState, useEffect, useCallback } from 'react'
import { apiUrl } from '../api.js'

const STORAGE_KEY = 'lanzalo_selected_company'

export default function useCompanySelection() {
  const [companies, setCompanies] = useState([])
  const [selectedCompanyId, setSelectedCompanyId] = useState(null)
  const [loadingCompanies, setLoadingCompanies] = useState(true)
  const token = localStorage.getItem('token')

  // Load companies and restore selection
  useEffect(() => {
    if (!token) {
      setLoadingCompanies(false)
      return
    }
    
    fetch(apiUrl('/api/user/companies'), {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        const list = data.companies || []
        setCompanies(list)

        if (list.length > 0) {
          // Try to restore from localStorage
          const saved = localStorage.getItem(STORAGE_KEY)
          const savedExists = saved && list.some(c => c.id === saved)
          
          if (savedExists) {
            setSelectedCompanyId(saved)
          } else {
            setSelectedCompanyId(list[0].id)
            localStorage.setItem(STORAGE_KEY, list[0].id)
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoadingCompanies(false))
  }, [token])

  // When selection changes, persist to localStorage
  const selectCompany = useCallback((id) => {
    setSelectedCompanyId(id)
    if (id) {
      localStorage.setItem(STORAGE_KEY, id)
    }
  }, [])

  return {
    companies,
    selectedCompanyId,
    selectCompany,
    loadingCompanies,
    // Convenience: the full company object
    selectedCompany: companies.find(c => c.id === selectedCompanyId) || null,
  }
}
