const DEFAULT_ENDPOINT = "http://localhost:1234/sparql";

export async function sparqlQuery(query: string) {
  const endpoint =
    (import.meta as any).env?.VITE_SPARQL_ENDPOINT ||
    (import.meta as any).env?.VITE_MDB_SPARQL_ENDPOINT ||
    DEFAULT_ENDPOINT;

  const q = (query ?? "").trim();

  console.log("SPARQL endpoint:", endpoint);
  console.log("SPARQL query length:", q.length);
  console.log("SPARQL query preview:", q.slice(0, 120));

  if (!q) {
    throw new Error("SPARQL query vacía (no se enviará)");
  }

  const body = new URLSearchParams({ query: q });

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "Accept": "application/sparql-results+json, application/json",
    },
    body,
  });

  const text = await res.text().catch(() => "");

  if (!res.ok) {
    throw new Error(`SPARQL error ${res.status}${text ? `: ${text}` : ""}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
