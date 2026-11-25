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

      <MarkdownViewer url={'https://raw.githubusercontent.com/ArKG-Data/ArKG-docs/refs/heads/main/predicates.md'} />

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

        <div className='miniversion-container'>
          <h2>Version 1.02</h2>
          <p>Two variants are available:</p>
          <ul>
            <li><b>Pure:</b> Contains only the core dating triples.</li>
            <li><b>Extended:</b> Includes the predicates <b>wdt:P131</b> and <b>wdt:P17</b>, which link each dated site to its political-administrative division, enabling location-aware graph exploration.</li>
          </ul>
          <div className='button-group'>
            <button onClick={() => handleDownload('v1.02')}> Download Pure</button>
            <button onClick={() => handleDownload('v1.02-extended')}> Download Extended</button>
          </div>
        </div>

        <div className='miniversion-container'>
          <h2>Version 1.10</h2>
          <p>Major update. The dataset now covers <b>10,222 archaeological sites</b> (previously 244) and 588 datings. The core dating data were preserved, while identifiers, vocabulary and geographic information were restructured.</p>
          <ul>
            <li><b>New sites:</b> 9,978 sites from the Chilean National Monuments Council (CMN) archaeological registry were added to the original 244. Coordinates are now available for 10,221 of 10,222 sites.</li>
            <li><b>Dating methods as Wikidata entities:</b> <b>arkgp:dating_method</b> and <b>arkgp:14C_type</b> now point to Wikidata items (<b>wd:Q173412</b> radiocarbon dating, <b>wd:Q2727388</b> thermoluminescence dating, <b>wd:Q530255</b> AMS, <b>wd:Q80354132</b> conventional) instead of text values. The 29 dates previously recorded with an unknown dating method are now classified as radiocarbon dating.</li>
            <li><b>New predicates:</b> <b>arkgp:reference_year</b> (1950 for all radiocarbon dates, as reported in Campbell and Quiroz 2015 for 111 thermoluminescence dates), <b>arkgp:TL_Age_BP</b>, <b>arkgp:lab_code</b> and <b>arkgp:site_name</b>.</li>
            <li><b>New vocabulary structure:</b> properties now live in <b>arkgp:</b>, dates in <b>arkgd:</b> (D000001-D000588) and sites in <b>arkgs:</b> (S000001-S010224). Identifiers from previous versions were not preserved.</li>
          </ul>
          <p>Two variants are available:</p>
          <ul>
            <li><b>Pure:</b> Contains only the core dating triples.</li>
            <li><b>Extended:</b> Includes the predicates <b>wdt:P131</b> and <b>wdt:P17</b>, which link each dated site to its political-administrative division, enabling location-aware graph exploration.</li>
          </ul>
          <div className='button-group'>
            <button onClick={() => handleDownload('v1.10')}> Download Pure</button>
            <button onClick={() => handleDownload('v1.10-extended')}> Download Extended</button>
          </div>
        </div>

      </div>

      <MarkdownViewer url={'https://raw.githubusercontent.com/ArKG-Data/ArKG-docs/refs/heads/main/bibliography.md'} />

    </div>
  );
};


export default DataPage;