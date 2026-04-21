import "./Data.css"
import MarkdownViewer from "../../Components/Navbar/MarkdownViewer/Markdown";

const DataPage = () => {

  const handleDownload = async (name) => {
    const fileUrl = 'https://raw.githubusercontent.com/ArKG-Data/ArKG-docs/refs/heads/main/data/' + name + '.ttl'
    const fileName = name + ".ttl"; 

    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      throw new Error(`Download failed: ${error}`);
    }
  };

  return (
    <div className='data-container'>
          
          <MarkdownViewer url={'https://raw.githubusercontent.com/ArKG-Data/ArKG-docs/refs/heads/main/predicates.md'}/>

          <div className='video-section'>
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
          
          <div className='markdown-body'>

            <h1>Dataset Versions</h1>
            
            <div className='miniversion-container'>
              <h2>Version 1.00</h2>
              <p>The first RDF triples were generated. The data came from the Excel file “Mendez et al. 2015 mmc3.”.</p>
              <button onClick={() => handleDownload('v1.00')}> Download</button>
            </div>

            <div className='miniversion-container'>
              <h2>Version 1.01</h2>
              <p>Additional data was added, originating from the Excel file “Campbell and Quiroz 2015 database dates.</p>
              <p>The predicate <b>:TL_Age_AC_DC</b> was also added.</p>
              <button onClick={() => handleDownload('v1.01')}> Download</button>
            </div>


          </div>

          <MarkdownViewer url={'https://raw.githubusercontent.com/ArKG-Data/ArKG-docs/refs/heads/main/bibliography.md'}/>

    </div>
  );
};


export default DataPage;