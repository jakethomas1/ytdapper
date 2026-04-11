import { useRef, useEffect } from "react";

interface InputLinkComponentProps {
  url: string;
  quality: string;
  isAudioOnly: boolean;
  error: string;
  onUrlChange: (url: string | ((prev: string) => string)) => void;
  onQualityChange: (quality: string) => void;
  onAudioOnlyChange: (value: boolean) => void;
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
  isAudioOnly,
  error,
  onUrlChange,
  onQualityChange,
  onAudioOnlyChange,
  onDownload,
}: InputLinkComponentProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUrlChange(e.target.value);
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(Math.max(74, textarea.scrollHeight), 120) + 'px';
    }
  };

  const handleClear = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '74px';
    }
    onUrlChange("");
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      onUrlChange((prev) => prev + text + "\n");
      textareaRef.current?.focus();
    } catch (e) {
      console.error("Failed to read clipboard:", e);
    }
  };

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handlePasteEvent = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData('text/plain') ?? '';
      e.preventDefault();
      document.execCommand('insertText', false, text + '\n');
      textarea.focus();
    };

    textarea.addEventListener('paste', handlePasteEvent);

    return () => {
      textarea.removeEventListener('paste', handlePasteEvent);
    };
  }, []);

  return (
    <div className="input-row">
      <span className="row-label">Download:</span>
      <div className="download-section">
        <div className="text-input-wrapper">
          <textarea
            ref={textareaRef}
            className="url-input"
            placeholder="Paste Video URL here..."
            value={url}
            onChange={handleInput}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onDownload();
              }
            }}
          />
          <span className={url ? "paste-btn clear-btn" : "paste-btn"} onClick={url ? handleClear : handlePaste} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && (url ? handleClear : handlePaste)()}>
            <img src={url ? "/icons/clear.svg" : "/icons/clipboard.svg"} alt={url ? "Clear" : "Paste"} />
          </span>
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
          <input 
            type="checkbox" 
            id="audio-only-select" 
            className="audio-only"
            checked={isAudioOnly}
            onChange={(e) => onAudioOnlyChange(e.target.checked)}
          />
          Audio-only
        </label>
        {!isAudioOnly && (
        <div className="quality-select-wrapper">
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
          <span className="quality-select-arrow">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#333"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </div>
        )}
        </div>
      </div>
      {error && <div className="error-message">{error}</div>}
    </div>
  );
}
