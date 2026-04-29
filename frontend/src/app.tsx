import { useState } from 'react'
import { Button } from 'primereact/button'
import { InputText } from 'primereact/inputtext'
import { Card } from 'primereact/card'
import { Tag } from 'primereact/tag'

type Status = 'idle' | 'ok' | 'error'

export default function App() {
  const [input, setInput] = useState('')
  const [response, setResponse] = useState('')
  const [status, setStatus] = useState<Status>('idle')

  const handlePing = async () => {
    try {
      const res = await fetch('/api/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      })
      const data = await res.json()
      if (res.ok) {
        setResponse(data.pong)
        setStatus('ok')
      } else {
        setResponse('Validierungsfehler vom Backend')
        setStatus('error')
      }
    } catch {
      setResponse('Backend nicht erreichbar')
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <Card className="w-full max-w-md">

        <h1 className="text-xl font-semibold text-gray-800 mb-1">
          Stack Test
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          React · TypeScript · Tailwind · PrimeReact · Fastify · Zod
        </p>

        <div className="flex flex-col gap-3">
          <InputText
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Nachricht eingeben..."
            className="w-full"
          />

          <Button
            label="Ping Backend"
            icon="pi pi-send"
            onClick={handlePing}
            disabled={!input.trim()}
            className="w-full"
          />

          {status !== 'idle' && (
            <div className="flex items-center gap-2 mt-2">
              <Tag
                severity={status === 'ok' ? 'success' : 'danger'}
                value={status === 'ok' ? '✓ Backend antwortet' : '✗ Fehler'}
              />
              <span className="text-sm text-gray-600">{response}</span>
            </div>
          )}
        </div>

      </Card>
    </div>
  )
}