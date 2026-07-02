import { FastifyReply, FastifyRequest } from "fastify";

export const notFoundHandler = (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  return reply.code(404).send({
    success: false,
    error: {
      code: "ROUTE_NOT_FOUND",
      message: `Route ${request.method} ${request.url} not found`,
    },
  });
};