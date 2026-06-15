import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { ApiError } from '../../../../src/common/errors/ApiError.js'
import { errorHandler } from '../../../../src/common/middleware/errorHandler.js'
import { notFoundHandler } from '../../../../src/common/middleware/notFoundHandler.js'

function createReply() {
  return {
    code: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  }
}

function createRequest() {
  return {
    method: 'GET',
    url: '/missing',
    log: {
      error: vi.fn(),
    },
  }
}

describe('errorHandler', () => {
  it('formatiert Zod-Fehler als Validierungsfehler', () => {
    const reply = createReply()
    const request = createRequest()
    const result = z.object({ name: z.string().min(1) }).safeParse({ name: '' })

    if (result.success) {
      throw new Error('expected invalid test input')
    }

    errorHandler(result.error, request as never, reply as never)

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

  it('formatiert ApiError mit Statuscode und Details', () => {
    const reply = createReply()
    const request = createRequest()

    errorHandler(
      new ApiError(409, 'CONFLICT', 'Already exists', { field: 'email' }),
      request as never,
      reply as never,
    )

    expect(reply.code).toHaveBeenCalledWith(409)
    expect(reply.send).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'CONFLICT',
        message: 'Already exists',
        details: { field: 'email' },
      },
    })
  })

  it('loggt unerwartete Fehler und antwortet mit 500', () => {
    const reply = createReply()
    const request = createRequest()
    const error = new Error('boom')

    errorHandler(error, request as never, reply as never)

    expect(request.log.error).toHaveBeenCalledWith(error)
    expect(reply.code).toHaveBeenCalledWith(500)
    expect(reply.send).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    })
  })
})

describe('notFoundHandler', () => {
  it('antwortet mit 404 und Route-Kontext', () => {
    const reply = createReply()
    const request = createRequest()

    notFoundHandler(request as never, reply as never)

    expect(reply.code).toHaveBeenCalledWith(404)
    expect(reply.send).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: 'Route GET /missing not found',
      },
    })
  })
})
