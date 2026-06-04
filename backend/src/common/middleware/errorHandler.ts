import { FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { ApiError } from "../errors/ApiError.js";

const formatZodErrors = (error: ZodError) =>
  error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));

export const errorHandler = (
  error: unknown,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  if (error instanceof ZodError) {
    return reply.code(400).send({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Request body is invalid",
        details: formatZodErrors(error),
      },
    });
  }

  if (error instanceof ApiError) {
    return reply.code(error.statusCode).send({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
  }

  request.log.error(error);

  return reply.code(500).send({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
    },
  });
};