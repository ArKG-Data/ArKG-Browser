import React from 'react';
import { useNavigate } from 'react-router-dom';

interface SiteData {
  iri: string;
  label?: string;
}

interface InyectQueryProps {
  site: SiteData | null;
  minYear: number;
  maxYear: number;
}

const InyectQuery: React.FC<InyectQueryProps> = ({ site, minYear, maxYear }) => {
  const navigate = useNavigate();

  const handleInyectar = () => {
    if (!site?.iri) {
      console.warn("No se puede inyectar la consulta: falta el IRI del sitio.");
      return;
    }

    const query = `PREFIX :    <https://arkg.cl/>
PREFIX wd:  <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX rdfs:<http://www.w3.org/2000/01/rdf-schema#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

SELECT DISTINCT ?Dating ?Material ?Method ?14C_Age ?TL_Age ?Ref
WHERE {
  ?s wdt:P9047 <${site.iri}> .
  ?s rdfs:label ?Dating .
  ?s rdf:type :Fechado .

  OPTIONAL { ?s wdt:P1343 ?Ref . }
  OPTIONAL {
    ?s wdt:P186 ?materialURI .
    ?materialURI rdfs:label ?Material .
  }
  OPTIONAL { ?s :dating_method ?Method . }
  OPTIONAL { ?s :14C_age ?14C_Age . }
  OPTIONAL { ?s :TL_Age_AC_DC ?TL_Age . }

  FILTER(
    (!BOUND(?14C_Age) && !BOUND(?TL_Age))
    ||
    (
      (BOUND(?14C_Age) &&
        (xsd:decimal(2026) - xsd:decimal(?14C_Age)) >= xsd:decimal(${minYear}) &&
        (xsd:decimal(2026) - xsd:decimal(?14C_Age)) <= xsd:decimal(${maxYear})
      )
      ||
      (BOUND(?TL_Age) &&
        xsd:decimal(?TL_Age) >= xsd:decimal(${minYear}) &&
        xsd:decimal(?TL_Age) <= xsd:decimal(${maxYear})
      )
    )
  )
}`;

    const searchParams = new URLSearchParams();
    searchParams.set('action', 'new');
    searchParams.set('code', query);

    navigate({
      pathname: '/queries',
      search: `?${searchParams.toString()}`,
    });
  };

  return (
    <button 
      className="inyect-query-btn" 
      onClick={handleInyectar}
      disabled={!site}
      style={{ opacity: !site ? 0.5 : 1, cursor: !site ? 'not-allowed' : 'pointer' }}
    >
      View in Queries
    </button>
  );
};

export default InyectQuery;