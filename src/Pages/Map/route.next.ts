import { NextRequest } from "next/server";

const SPARQL_ENDPOINT = "http://localhost:1234/sparql";

export async function POST(req: NextRequest) {
  const query = await req.text();

  const response = await fetch(SPARQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/sparql-query",
      "Accept": "application/sparql+json",
    },
    body: query,
  });

  const text = await response.text();

  return new Response(text, {
    status: response.status,
    headers: {
      "Content-Type": "application/sparql+json",
    },
  });
}

