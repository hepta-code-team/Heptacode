import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { validateRequest } from '../../../../src/common/middleware/validateRequest.js'

function createReply() {
  return {
    code: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  }
}

describe('validateRequest', () => {
  it('validiert und ersetzt body, params und query bei gueltigen Daten', async () => {
    const request = {
      body: { age: '42' },
      params: { id: 'abc' },
      query: { page: '2' },
    }
    const reply = createReply()

    await validateRequest({
      body: z.object({ age: z.coerce.number() }),
      params: z.object({ id: z.string().min(1) }),
      query: z.object({ page: z.coerce.number() }),
    })(request as never, reply as never)

    expect(request.body).toEqual({ age: 42 })
    expect(request.params).toEqual({ id: 'abc' })
    expect(request.query).toEqual({ page: 2 })
    expect(reply.send).not.toHaveBeenCalled()
  })

  it('antwortet mit 400 bei ungueltigem Body', async () => {
    const request = {
      body: { age: 'abc' },
    }
    const reply = createReply()

    await validateRequest({
      body: z.object({ age: z.coerce.number() }),
    })(request as never, reply as never)

    expect(reply.code).toHaveBeenCalledWith(400)
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          message: 'Request body is invalid',
        }),
      }),
    )
  })

  it('laesst Requests ohne konfigurierte Schemas unveraendert durch', async () => {
    const request = {
      body: { age: '42' },
    }
    const reply = createReply()

    await validateRequest({})(request as never, reply as never)

    expect(request.body).toEqual({ age: '42' })
    expect(reply.send).not.toHaveBeenCalled()
  })

  it('antwortet mit 400 bei ungueltigen Parametern', async () => {
    const request = {
      params: { id: '' },
    }
    const reply = createReply()

    await validateRequest({
      params: z.object({ id: z.string().min(1) }),
    })(request as never, reply as never)

    expect(reply.code).toHaveBeenCalledWith(400)
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          message: 'Request parameters are invalid',
        }),
      }),
    )
  })

  it('antwortet mit 400 bei ungueltigen Query-Parametern', async () => {
    const request = {
      query: { page: 'abc' },
    }
    const reply = createReply()

    await validateRequest({
      query: z.object({ page: z.coerce.number() }),
    })(request as never, reply as never)

    expect(reply.code).toHaveBeenCalledWith(400)
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          message: 'Query parameters are invalid',
        }),
      }),
    )
  })
})
