import { useCallback, useEffect, useState } from 'react'

declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
      on: (event: string, handler: (...args: unknown[]) => void) => void
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void
    }
  }
}

export interface MetaMaskState {
  isInstalled: boolean
  isConnected: boolean
  account: string | null
  chainId: string | null
  isLoading: boolean
  error: string | null
}

export function useMetaMask() {
  const [state, setState] = useState<MetaMaskState>({
    isInstalled: false,
    isConnected: false,
    account: null,
    chainId: null,
    isLoading: false,
    error: null,
  })

  useEffect(() => {
    const installed = Boolean(window.ethereum?.isMetaMask)
    setState(s => ({ ...s, isInstalled: installed }))

    if (!installed) return

    // Restore existing connection silently
    window.ethereum!.request({ method: 'eth_accounts' }).then((accounts) => {
      const list = accounts as string[]
      if (list.length > 0) {
        setState(s => ({ ...s, isConnected: true, account: list[0] }))
      }
    }).catch(() => {})

    window.ethereum!.request({ method: 'eth_chainId' }).then((id) => {
      setState(s => ({ ...s, chainId: id as string }))
    }).catch(() => {})

    const handleAccountsChanged = (accounts: unknown) => {
      const list = accounts as string[]
      setState(s => ({
        ...s,
        isConnected: list.length > 0,
        account: list[0] ?? null,
      }))
    }

    const handleChainChanged = (id: unknown) => {
      setState(s => ({ ...s, chainId: id as string }))
    }

    window.ethereum!.on('accountsChanged', handleAccountsChanged)
    window.ethereum!.on('chainChanged', handleChainChanged)

    return () => {
      window.ethereum!.removeListener('accountsChanged', handleAccountsChanged)
      window.ethereum!.removeListener('chainChanged', handleChainChanged)
    }
  }, [])

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setState(s => ({ ...s, error: 'MetaMask not installed' }))
      return null
    }
    setState(s => ({ ...s, isLoading: true, error: null }))
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[]
      const account = accounts[0]
      setState(s => ({ ...s, isConnected: true, account, isLoading: false }))
      return account
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Connection failed'
      setState(s => ({ ...s, isLoading: false, error: msg }))
      return null
    }
  }, [])

  const disconnect = useCallback(() => {
    setState(s => ({ ...s, isConnected: false, account: null }))
  }, [])

  return { ...state, connect, disconnect }
}
