import "./Resources.css"
import MarkdownViewer from "../../Components/Navbar/MarkdownViewer/Markdown";

const ResourcesPage = () => {

    return (
        <div className='resources-container'>
            <div className="resources-content">
                <h1>Resources</h1>
                <p>Here you will find useful material about how to use ArKG.</p>

                <div className="recursos-section">
                    <h2>Videos (YouTube)</h2>
                    <ul>
                        <li><a href="https://www.youtube.com/" target="_blank" rel="noopener noreferrer">Introduction Video (Example)</a></li>
                        <li><a href="https://www.youtube.com/" target="_blank" rel="noopener noreferrer">Advanced Tutorial (Example)</a></li>
                    </ul>
                </div>

                <div className="recursos-section">
                    <h2>Guides (.md)</h2>
                    <ul>
                        <li><a href="https://raw.githubusercontent.com/ArKG-Data/ArKG-docs/refs/heads/main/about.md" target="_blank" rel="noopener noreferrer">Quick Start Guide</a></li>
                        <li><a href="https://raw.githubusercontent.com/ArKG-Data/ArKG-docs/refs/heads/main/about.md" target="_blank" rel="noopener noreferrer">Complete Documentation</a></li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default ResourcesPage;

