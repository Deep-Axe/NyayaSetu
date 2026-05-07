import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Set worker source
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface Highlight {
  page: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  field_name: string;
  confidence: 'high' | 'medium' | 'low';
}

interface PDFViewerProps {
  pdfUrl: string;
  highlights: Highlight[];
}

const PDFViewer: React.FC<PDFViewerProps> = ({ pdfUrl, highlights }) => {
  const [numPages, setNumPages] = useState<number | null>(null);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  return (
    <div className="pdf-viewer-container" style={{ height: '100vh', overflowY: 'auto', position: 'relative' }}>
      <Document file={pdfUrl} onLoadSuccess={onDocumentLoadSuccess}>
        {Array.from(new Array(numPages || 0), (el, index) => (
          <div key={`page_${index + 1}`} style={{ position: 'relative', marginBottom: '20px' }}>
            <Page pageNumber={index + 1} />
            {highlights.filter(h => h.page === index + 1).map((h, i) => (
              <div 
                key={i} 
                style={{
                  position: 'absolute',
                  left: `${h.x0}px`,
                  top: `${h.y0}px`,
                  width: `${h.x1 - h.x0}px`,
                  height: `${h.y1 - h.y0}px`,
                  backgroundColor: h.confidence === 'high' ? 'rgba(255, 255, 0, 0.3)' : h.confidence === 'medium' ? 'rgba(255, 165, 0, 0.3)' : 'rgba(255, 0, 0, 0.3)',
                  border: h.confidence === 'low' ? '2px dashed red' : 'none',
                  pointerEvents: 'none'
                }} 
              />
            ))}
          </div>
        ))}
      </Document>
    </div>
  );
};

export default PDFViewer;
