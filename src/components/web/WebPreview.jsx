"use client";

import { useEffect, useRef, useState } from "react";

export default function WebPreview({ html, css, js }) {
  const iframeRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!iframeRef.current) return;

    try {
      setError(null);

      // Create a complete HTML document with injected CSS and JS
      const completeHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    ${css}
  </style>
</head>
<body>
  ${html}
  <script>
    (function() {
      try {
        ${js}
      } catch (err) {
        console.error('Runtime error:', err);
        document.body.insertAdjacentHTML('beforeend',
          '<div style="color: red; padding: 10px; margin: 10px; border: 1px solid red; border-radius: 4px;">' +
          'Error: ' + err.message +
          '</div>'
        );
      }
    })();
  </script>
</body>
</html>
      `;

      // Write to iframe
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(completeHtml);
        doc.close();
      }
    } catch (err) {
      setError(err.message);
    }
  }, [html, css, js]);

  return (
    <div className="h-full w-full overflow-hidden bg-white">
      {error && (
        <div className="border-b border-red-300 bg-red-50 p-4 text-sm text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}
      <iframe
        ref={iframeRef}
        className="h-full w-full border-0"
        title="Web Preview"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
}
