import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const PdfPreview = ({ url, label }) => {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(760);
  const [error, setError] = useState("");

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return undefined;
    const updateWidth = () => setWidth(Math.max(260, Math.min(820, element.clientWidth - 24)));
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="min-h-0 flex-1 overflow-auto rounded-lg border bg-slate-100 p-3">
      <Document
        file={url}
        loading={<p className="p-8 text-center text-sm font-semibold text-slate-600">Rendering PDF preview…</p>}
        error={<p className="p-8 text-center text-sm font-semibold text-red-700">{error || "PDF preview could not be rendered. Please use Download receipt."}</p>}
        onLoadError={(loadError) => setError(loadError.message)}
      >
        <Page
          pageNumber={1}
          width={width}
          renderAnnotationLayer={false}
          renderTextLayer={false}
          aria-label={`${label} first page`}
        />
      </Document>
    </div>
  );
};

export default PdfPreview;
