import { type CSSProperties } from 'react';

type PreviewPanelProps = {
  previewStyle: CSSProperties;
};

function PreviewPanel({ previewStyle }: PreviewPanelProps) {
  return (
    <section className="panel preview-panel">
      <h2>Preview</h2>
      <div className="preview" style={previewStyle}>
        <div className="preview-toolbar">
          <button className="preview-btn">-</button>
          <button className="preview-btn">+</button>
          <button className="preview-btn preview-reset">Fit</button>
        </div>
        <button className="preview-btn preview-close">&times;</button>
      </div>
    </section>
  );
}

export default PreviewPanel;
