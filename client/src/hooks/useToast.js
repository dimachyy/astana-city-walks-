import { useContext } from 'react'
import { ToastContext } from './toastContext.js'

export const useToast = () => useContext(ToastContext)
