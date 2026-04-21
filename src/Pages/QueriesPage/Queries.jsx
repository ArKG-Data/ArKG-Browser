import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./Queries.css";

const QueriesPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [iframeSrc, setIframeSrc] = useState("https://arkg.cl/queries/");

  useEffect(() => {
    if (location.search) {
      setIframeSrc(`https://arkg.cl/queries/${location.search}`);

      navigate("/queries", { replace: true });
    }
  }, [location.search, navigate]);

  return (
    <div className="iframe-container">
      <iframe 
        className="iframe"
        title="SPARQL Editor"
        src={iframeSrc}
      >
      </iframe>
    </div>
  );
};

export default QueriesPage;