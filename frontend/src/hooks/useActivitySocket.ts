import { useCallback, useEffect, useRef, useState } from 'react'

export type ActivitySocketStatus = 'connecting' | 'open' | 'closed' | 'error'

export interface ActivityMessage {
  id: string
  type: string
  content: string
  onlineCount: number
  timestamp: string
}

const MAX_MESSAGES = 5
const HEARTBEAT_INTERVAL = 25000
const RECONNECT_DELAY = 3000

const buildWebSocketUrl = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/ws/activity`
}

export const useActivitySocket = () => {
  const socketRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<number>()
  const heartbeatTimerRef = useRef<number>()
  const stoppedRef = useRef(false)

  const [status, setStatus] = useState<ActivitySocketStatus>('connecting')
  const [onlineCount, setOnlineCount] = useState(0)
  const [messages, setMessages] = useState<ActivityMessage[]>([])

  const clearTimers = useCallback(() => {
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = undefined
    }
    if (heartbeatTimerRef.current) {
      window.clearInterval(heartbeatTimerRef.current)
      heartbeatTimerRef.current = undefined
    }
  }, [])

  const sendActivity = useCallback((content: string) => {
    const socket = socketRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return
    }
    socket.send(JSON.stringify({ type: 'activity', content }))
  }, [])

  useEffect(() => {
    stoppedRef.current = false

    const connect = () => {
      clearTimers()
      setStatus('connecting')

      const socket = new WebSocket(buildWebSocketUrl())
      socketRef.current = socket

      socket.onopen = () => {
        setStatus('open')
        socket.send(JSON.stringify({ type: 'hello', content: 'A visitor opened the map home page' }))
        heartbeatTimerRef.current = window.setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'ping' }))
          }
        }, HEARTBEAT_INTERVAL)
      }

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as Omit<ActivityMessage, 'id'>
          setOnlineCount(data.onlineCount || 0)

          if (data.type === 'pong') {
            return
          }

          setMessages((prev) => [
            {
              id: `${data.timestamp}-${Math.random().toString(16).slice(2)}`,
              type: data.type,
              content: data.content,
              onlineCount: data.onlineCount || 0,
              timestamp: data.timestamp,
            },
            ...prev,
          ].slice(0, MAX_MESSAGES))
        } catch {
          // Ignore malformed messages from old clients or manual testing tools.
        }
      }

      socket.onerror = () => {
        setStatus('error')
        socket.close()
      }

      socket.onclose = () => {
        clearTimers()
        socketRef.current = null

        if (stoppedRef.current) {
          return
        }

        setStatus((currentStatus) => (currentStatus === 'error' ? 'error' : 'closed'))

        reconnectTimerRef.current = window.setTimeout(connect, RECONNECT_DELAY)
      }
    }

    connect()

    return () => {
      stoppedRef.current = true
      clearTimers()
      socketRef.current?.close()
      socketRef.current = null
    }
  }, [clearTimers])

  return {
    status,
    onlineCount,
    messages,
    sendActivity,
  }
}
