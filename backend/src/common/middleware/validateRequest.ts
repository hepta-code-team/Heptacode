import { FastifyReply, FastifyRequest } from "fastify";
import { ZodSchema } from "zod";

type RequestSchemas = {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
};

const formatZodErrors = (error: any) => {
  return error.issues.map((issue: any) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
};

export const validateRequest = (schemas: RequestSchemas) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (schemas.body) {
      const result = schemas.body.safeParse(request.body);

      if (!result.success) {
        return reply.code(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Request body is invalid",
            details: formatZodErrors(result.error),
          },
        });
      }

      (request as any).body = result.data;
    }

    if (schemas.params) {
      const result = schemas.params.safeParse(request.params);

      if (!result.success) {
        return reply.code(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Request parameters are invalid",
            details: formatZodErrors(result.error),
          },
        });
      }

      (request as any).params = result.data;
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(request.query);

      if (!result.success) {
        return reply.code(400).send({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Query parameters are invalid",
            details: formatZodErrors(result.error),
          },
        });
      }

      (request as any).query = result.data;
    }
  };
};