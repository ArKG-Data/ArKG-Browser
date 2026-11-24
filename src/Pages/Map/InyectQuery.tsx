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

    const query = `PREFIX :      <https://arkg.cl/>
PREFIX arkgp: <https://arkg.cl/property/>
PREFIX wd:    <http://www.wikidata.org/entity/>
PREFIX wdt:   <http://www.wikidata.org/prop/direct/>
PREFIX rdfs:  <http://www.w3.org/2000/01/rdf-schema#>
PREFIX rdf:   <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX xsd:   <http://www.w3.org/2001/XMLSchema#>

SELECT DISTINCT ?Dating ?Material ?Method ?MethodLabel ?14C_Age ?TL_Age ?Ref
WHERE {
  ?s rdf:type :Fechado ;
     rdfs:label ?Dating ;
     wdt:P9047 <${site.iri}> .

  OPTIONAL { ?s wdt:P1343 ?Ref . }
  OPTIONAL {
    ?s wdt:P186 ?materialURI .
    ?materialURI rdfs:label ?Material .
  }
  OPTIONAL {
    ?s arkgp:dating_method ?Method .
    ?Method rdfs:label ?MethodLabel .
  }
  OPTIONAL { ?s arkgp:14C_age ?14C_Age . }
  OPTIONAL { ?s arkgp:TL_Age_AC_DC ?TL_Age . }

  # Presente fijo en 1950: año BCE/CE del 14C = 1950 - 14C_age (solo cambio de escala)
  BIND(1950 - ?14C_Age AS ?C14_Year)

  FILTER(
    (!BOUND(?14C_Age) && !BOUND(?TL_Age))
    ||
    (BOUND(?14C_Age) &&
      ?C14_Year >= xsd:decimal(${minYear}) &&
      ?C14_Year <= xsd:decimal(${maxYear}))
    ||
    (BOUND(?TL_Age) &&
      ?TL_Age >= xsd:decimal(${minYear}) &&
      ?TL_Age <= xsd:decimal(${maxYear}))
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