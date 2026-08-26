import { authErrorResponse, requireUser } from "@/server/auth/guard";

export const dynamic = "force-dynamic";

/** Any signed-in caller. Shows what the guard actually resolved. */
export async function GET() {
  try {
    const principal = await requireUser();
    return Response.json(principal);
  } catch (error) {
    const response = authErrorResponse(error);
    if (response) return response;
    throw error;
  }
}
