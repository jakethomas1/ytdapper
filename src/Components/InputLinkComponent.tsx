interface InputLinkComponentProps {
  url: string;
  quality: string;
  error: string;
  onUrlChange: (url: string) => void;
  onQualityChange: (quality: string) => void;
  onDownload: () => void;
}

const QUALITY_OPTIONS = [
  { value: "144", label: "144p" },
  { value: "240", label: "240p" },
  { value: "360", label: "360p" },
  { value: "480", label: "480p" },
  { value: "720", label: "720p (HD)" },
  { value: "1080", label: "1080p (Full HD)" },
  { value: "1440", label: "1440p (2K)" },
  { value: "2160", label: "4K (2160p)" },
  { value: "4320", label: "8K (4320p)" },
];

export default function InputLinkComponent({
  url,
  quality,
  error,
  onUrlChange,
  onQualityChange,
  onDownload,
}: InputLinkComponentProps) {
  return (
    <div className="input-row">
      <span className="row-label">Download:</span>
      <div className="download-section">
        <div className="text-input-wrapper">
          <input
            type="text"
            className="url-input"
            placeholder="Paste YouTube URL here..."
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
          />
          <button className="download-btn" onClick={onDownload}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
        </div>
        <div className="qual-arg-wrapper">
        <label>
          <input type="checkbox" id="audio-only-select" className="audio-only"/>
          Audio-only
        </label>
        <select
          id="quality-select"
          className="quality-select"
          value={quality}
          onChange={(e) => onQualityChange(e.target.value)}
        >
          {QUALITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        
        </div>
      </div>
      {error && <div className="error-message">{error}</div>}
    </div>
  );
}
