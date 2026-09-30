import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { SystemSnapshot } from "../types/system";

export function useSystemMonitor() {
    const [system, setSystem] = useState<SystemSnapshot | null>(null)
    const [connected, setConnected] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const token = localStorage.getItem('carthage_token')
        if (!token) {
            setError('Authentication token not found')
            return
        }

        const controller = new AbortController()
        let retryTimer: ReturnType<typeof setTimeout> | undefined
        let stopped = false

        async function loadSnapshot() {
            try {
                const response = await api.get('/system', {
                    signal: controller.signal,
                })

                setSystem(response.data.data)
                setError(null)
            } catch (err) {
                if (!controller.signal.aborted) {
                    setError('Unable to load system metrics')
                }
            }
        }

        async function connectStream() {
            try {
                const response = await fetch('/api/system/stream', {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: 'text/event-stream',
                    },
                    signal: controller.signal,
                })

                if (!response.ok || !response.body) {
                    throw new Error(`SSE connection failed: ${response.status}`)
                }

                setConnected(true)
                setError(null)

                const reader = response.body.getReader()
                const decoder = new TextDecoder()
                let buffer = ''

                while (!stopped) {
                    const {value, done} = await reader.read()
                    if (done) break

                    buffer += decoder.decode(value, { stream: true })
                    buffer = buffer.replace(/\r\n/g, '\n')

                    let boundary: number
                    while ((boundary = buffer.indexOf('\n\n')) !== -1) {
                        const message = buffer.slice(0, boundary)
                        buffer = buffer.slice(boundary + 2)

                        const eventName = message.split('\n').find((line) => line.startsWith('event:'))?.slice(6).trim()
                        const data = message.split('\n').filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trimStart()).join('\n')

                        if (eventName === 'system' && data) {
                            try {
                                setSystem(JSON.parse(data) as SystemSnapshot)
                                setError(null)
                            } catch {
                                setError('invalid system metrics recieved')
                            }
                        } else if (eventName === 'error') {
                            setError('System metrics are temporarily unvailable')
                        }
                    }
                }

                if (!stopped) {
                    throw new Error('SSE stream ended')
                }
            } catch (err) {
                if (stopped || controller.signal.aborted) return

                setConnected(false)
                setError('Realtime connection lost. Reconnecting...')
                retryTimer = setTimeout(connectStream, 3000)
            }
        }

        void loadSnapshot()
        void connectStream()

        return () => {
            stopped = true
            controller.abort()
            if (retryTimer) clearTimeout(retryTimer)
        }
    }, [])

    return {system, connected, error}
}