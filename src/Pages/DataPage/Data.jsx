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


            <h1>Bibliography Used</h1>

            <ul className='bibliography-list'>
              <li>
                Campbell, R., &amp; Quiroz, D. (2015). Chronological database for Southern Chile (35°30′–42° S), ∼33000 BP to present: Human implications and archaeological biases. <em>Quaternary International</em>, <em>356</em>, 39–53. <a href="https://doi.org/10.1016/j.quaint.2014.07.026" target="_blank" rel="noreferrer">https://doi.org/10.1016/j.quaint.2014.07.026</a>
              </li>
              <li>
                Méndez, C., Gil, A., Neme, G., Nuevo Delaunay, A., Cortegoso, V., Huidobro, C., Durán, V., &amp; Maldonado, A. (2015). Mid Holocene radiocarbon ages in the Subtropical Andes (∼29°–35° S), climatic change and implications for human space organization. <em>Quaternary International</em>, <em>356</em>, 15–26. <a href="https://doi.org/10.1016/j.quaint.2014.06.059" target="_blank" rel="noreferrer">https://doi.org/10.1016/j.quaint.2014.06.059</a>
              </li>
            </ul>

          </div>

    </div>
  );
};


export default DataPage;