import React from 'react';

const DownloadCSVButton = ({ fechados, selectedSiteName }) => {
  const handleDownload = () => {
    const csvContent = [
      ['Dating', 'Material', 'Method', '14C Age', 'TL Age', 'Ref'],
      ...fechados.map(item => [item.label, item.material, item.method, item.age, item.tlAge, item.reference])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedSiteName.replace(/\s+/g, '_')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <button className="download-csv-btn" onClick={handleDownload}>Descargar CSV</button>
  );
};

export default DownloadCSVButton;