import "./Recursos.css"
import MarkdownViewer from "../../Components/Navbar/MarkdownViewer/Markdown";

const RecursosPage = () => {

    return (
        <div className='recursos-container'>
            <div className="recursos-content">
                <h1>Recursos</h1>
                <p>Aquí encontrarás material útil sobre cómo utilizar ArKG.</p>

                <div className="recursos-section">
                    <h2>Videos (YouTube)</h2>
                    <ul>
                        <li><a href="https://www.youtube.com/" target="_blank" rel="noopener noreferrer">Video de Introducción (Ejemplo)</a></li>
                        <li><a href="https://www.youtube.com/" target="_blank" rel="noopener noreferrer">Tutorial Avanzado (Ejemplo)</a></li>
                    </ul>
                </div>

                <div className="recursos-section">
                    <h2>Guías (.md)</h2>
                    <ul>
                        <li><a href="https://raw.githubusercontent.com/ArKG-Data/ArKG-docs/refs/heads/main/about.md" target="_blank" rel="noopener noreferrer">Guía de Inicio Rápido</a></li>
                        <li><a href="https://raw.githubusercontent.com/ArKG-Data/ArKG-docs/refs/heads/main/about.md" target="_blank" rel="noopener noreferrer">Documentación Completa</a></li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default RecursosPage;

