import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useAppStore = defineStore('app', () => {
  const theme = ref(localStorage.getItem('theme') || 'light')

  const toggleTheme = () => {
    setTheme(theme.value === 'light' ? 'dark' : 'light')
  }

  const setTheme = (val: string) => {
    theme.value = val
    localStorage.setItem('theme', val)
    applyTheme()
  }

  const applyTheme = () => {
    if (theme.value === 'dark') {
      document.body.setAttribute('arco-theme', 'dark')
    } else {
      document.body.removeAttribute('arco-theme')
    }
  }

  // Initialize theme
  applyTheme()

  return {
    theme,
    toggleTheme,
    setTheme,
    applyTheme
  }
})
