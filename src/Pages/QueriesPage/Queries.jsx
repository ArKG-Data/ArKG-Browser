import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./Queries.css";

const QueriesPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [iframeSrc, setIframeSrc] = useState(`${import.meta.env.VITE_ARKG_QUERIES_URL}/`);

  useEffect(() => {
    if (location.search) {
      setIframeSrc(`${import.meta.env.VITE_ARKG_QUERIES_URL}/${location.search}`);

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
