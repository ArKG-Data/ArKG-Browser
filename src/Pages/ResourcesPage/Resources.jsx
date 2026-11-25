import "./Resources.css"

const REPOSITORIES = [
    { name: "ArKG", url: "https://github.com/ArKG-Data/ArKG", description: "Unified repository that groups all project modules." },
    { name: "ArKG-Browser", url: "https://github.com/ArKG-Data/ArKG-Browser", description: "Source code of this website." },
    { name: "ArKG-Docs", url: "https://github.com/ArKG-Data/ArKG-docs", description: "Documentation and dataset versions (RDF/Turtle)." },
    { name: "ArKG-Data", url: "https://github.com/ArKG-Data/ArKG-Data", description: "Scripts that convert the source spreadsheets into RDF." },
    { name: "pyarkg", url: "https://github.com/ArKG-Data/pyarkg", description: "Python client for querying ArKG." },
    { name: "arkg-r", url: "https://github.com/ArKG-Data/arkg-r", description: "R client for querying ArKG." },
];

const ResourcesPage = () => {

    return (
        <div className='resources-container'>
            <div className="resources-content">
                <h1>Resources</h1>
                <p>Here you will find useful material about how to use ArKG.</p>

                <div className="resources-section">
                    <h2>Demo Video</h2>
                    <div className='video-wrapper'>
                        <iframe
                            src="https://www.youtube.com/embed/jlUXf-OVesE"
                            title="ArKG Demo"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    </div>
                </div>

                <div className="resources-section">
                    <h2>Guides (.md)</h2>
                    <ul>
                        <li><a href="https://raw.githubusercontent.com/ArKG-Data/ArKG-docs/refs/heads/main/about.md" target="_blank" rel="noopener noreferrer">Quick Start Guide</a></li>
                        <li><a href="https://raw.githubusercontent.com/ArKG-Data/ArKG-docs/refs/heads/main/about.md" target="_blank" rel="noopener noreferrer">Complete Documentation</a></li>
                    </ul>
                </div>

                <div className="resources-section">
                    <h2>Source code</h2>
                    <p className="repo-description">ArKG is fully open source. To cite the project, see <a href="/">How to Cite</a> on the home page.</p>
                    <ul>
                        {REPOSITORIES.map((repo) => (
                            <li key={repo.name}>
                                <a href={repo.url} target="_blank" rel="noopener noreferrer">{repo.name}</a> — {repo.description}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default ResourcesPage;
