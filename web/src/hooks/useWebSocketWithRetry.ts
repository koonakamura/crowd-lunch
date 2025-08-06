import { useEffect, useRef, useState, useCallback } from 'react'
import { toast } from './use-toast'

interface WebSocketMessage {
  type: string
  order_id?: number
  customer_name?: string
  user_id?: number
  data?: any
}

interface UseWebSocketWithRetryOptions {
  url: string
  enabled: boolean
  maxRetries?: number
  retryInterval?: number
  onMessage?: (data: WebSocketMessage) => void
  onConnectionChange?: (connected: boolean) => void
}

export function useWebSocketWithRetry({
  url,
  enabled,
  maxRetries = 5,
  retryInterval = 3000,
  onMessage,
  onConnectionChange
}: UseWebSocketWithRetryOptions) {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const wsRef = useRef<WebSocket | null>(null)
  const retryTimeoutRef = useRef<number | null>(null)

  const showErrorBanner = retryCount >= maxRetries

  const connect = useCallback(() => {
    if (!enabled || wsRef.current?.readyState === WebSocket.CONNECTING) {
      return
    }

    try {
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        setIsConnected(true)
        setConnectionError(null)
        setRetryCount(0)
        onConnectionChange?.(true)
        
        if (showErrorBanner) {
          toast({
            title: "接続復旧",
            description: "WebSocket接続が復旧しました",
            variant: "default",
          })
        }
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          onMessage?.(data)
        } catch (error) {
          console.error('WebSocket message parsing error:', error)
        }
      }

      ws.onclose = (event) => {
        setIsConnected(false)
        onConnectionChange?.(false)
        
        if (enabled && event.code !== 1000) {
          setRetryCount(prev => prev + 1)
          
          if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current)
          }
          
          retryTimeoutRef.current = window.setTimeout(() => {
            connect()
          }, retryInterval)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setConnectionError('WebSocket接続エラーが発生しました')
        setIsConnected(false)
        onConnectionChange?.(false)
      }

    } catch (error) {
      console.error('WebSocket connection failed:', error)
      setConnectionError('WebSocket接続に失敗しました')
      setRetryCount(prev => prev + 1)
      
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
      
      retryTimeoutRef.current = window.setTimeout(() => {
        connect()
      }, retryInterval)
    }
  }, [url, enabled, retryInterval, onMessage, onConnectionChange, showErrorBanner])

  const disconnect = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000)
      wsRef.current = null
    }
    
    setIsConnected(false)
    setConnectionError(null)
    setRetryCount(0)
    onConnectionChange?.(false)
  }, [onConnectionChange])

  useEffect(() => {
    if (enabled) {
      connect()
    } else {
      disconnect()
    }

    return () => {
      disconnect()
    }
  }, [enabled, connect, disconnect])

  useEffect(() => {
    if (showErrorBanner && connectionError) {
      toast({
        title: "通信エラー",
        description: `WebSocket接続に失敗しました (${retryCount}/${maxRetries}回試行)`,
        variant: "destructive",
      })
    }
  }, [showErrorBanner, connectionError, retryCount, maxRetries])

  return {
    isConnected,
    connectionError,
    retryCount,
    showErrorBanner,
    disconnect
  }
}
