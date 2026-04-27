import { useRef, useEffect, forwardRef, useImperativeHandle, useMemo } from "react";
import { useResizeObserver } from 'usehooks-ts';

export interface InputLinkRef {
  clear: () => void;
}

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

const InputLinkComponent = forwardRef<InputLinkRef, InputLinkComponentProps>(({
  url,
  quality,
  isAudioOnly,
  error,
  onUrlChange,
  onQualityChange,
  onAudioOnlyChange,
  onDownload,
}, ref) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { width: wrapperWidth = 370 } = useResizeObserver({ ref: wrapperRef as any });
  const contentRef = useRef<HTMLDivElement>(null);

  const clipPath = useMemo(() => {
    const x1 = 8;
    const r1 = x1 / 2;
    return `path('M 0 0 L ${wrapperWidth - x1} 0 L ${wrapperWidth - x1} ${r1} A ${r1} ${r1} 0 0 0 ${wrapperWidth - r1} ${x1} L ${wrapperWidth} ${x1} L ${wrapperWidth} 200 L 0 200 Z')`;
}, [wrapperWidth]);

  const handleInput = () => {
    const div = contentRef.current;
    if (div) {
      onUrlChange(div.textContent || '');
      div.style.height = 'auto';
      div.style.height = Math.min(div.scrollHeight, 96) + 'px';
    }
  };

  const handleClear = () => {
    if (contentRef.current) {
      contentRef.current.textContent = '';
      contentRef.current.style.height = 'auto';
    }
    onUrlChange("");
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const div = contentRef.current;
      if (div) {
        
        handleInput();
        div.focus();
        document.execCommand('insertText', false, text + "\n");
        
      }
      onUrlChange((prev) => prev + text + "\n");
    } catch (e) {
      console.error("Failed to read clipboard:", e);
    }
  };

  useImperativeHandle(ref, () => ({
    clear: handleClear
  }), [handleClear]);

  useEffect(() => {
    const div = contentRef.current;
    if (!div) return;

    const handlePasteEvent = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData('text/plain') ?? '';
      e.preventDefault();
      document.execCommand('insertText', false, text + '\n');
      div.focus();
    };

    div.addEventListener('paste', handlePasteEvent);

    return () => {
      div.removeEventListener('paste', handlePasteEvent);
    };
  }, []);

  return (
    <div className="input-row">
      <span className="row-label">Download:</span>
      <div className="download-section">
        <span className="clear-btn" onClick={handleClear} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && handleClear()}>
          <svg viewBox="0 0 48 48">
            <defs>
              <linearGradient id="icon-x-main-gradient" x1="7.534" y1="7.534" x2="27.557" y2="27.557" gradientUnits="userSpaceOnUse">
                <stop offset="0" stop-color="#f44f5a"/>
                <stop offset=".443" stop-color="#ee3d4a"/>
                <stop offset="1" stop-color="#e52030"/>
              </linearGradient>

              <linearGradient id="icon-x-shadow-gradient" x1="27.373" y1="27.373" x2="40.507" y2="40.507" gradientUnits="userSpaceOnUse">
                <stop offset="0" stop-color="#a8142e"/>
                <stop offset=".179" stop-color="#ba1632"/>
                <stop offset=".243" stop-color="#c21734"/>
              </linearGradient>
            </defs>

            <path fill="url(#icon-x-main-gradient)" d="M42.42 12.401c.774-.774.774-2.028 0-2.802L38.401 5.58c-.774-.774-2.028-.774-2.802 0L24 17.179 12.401 5.58c-.774-.774-2.028-.774-2.802 0L5.58 9.599c-.774.774-.774 2.028 0 2.802L17.179 24 5.58 35.599c-.774.774-.774 2.028 0 2.802l4.019 4.019c.774.774 2.028.774 2.802 0L42.42 12.401z"/>
            
            <path fill="url(#icon-x-shadow-gradient)" d="M24 30.821 35.599 42.42c.774.774 2.028.774 2.802 0l4.019-4.019c.774-.774.774-2.028 0-2.802L30.821 24 24 30.821z"/>
          </svg>
        </span> 
        <div className="text-input-wrapper">
          <div
            ref={wrapperRef}
            className="input-content-wrapper"
            style={{ clipPath }}
          >
            <div
              ref={contentRef}
              className="content-editable"
              contentEditable
              data-placeholder="Paste Video URL here..."
              suppressContentEditableWarning
              onInput={handleInput}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onDownload();
                }
              }}
            />
            <div className="flex-col">
              
              <span className="paste-btn" onClick={handlePaste} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && handlePaste()}>
                <img src="/icons/clipboard.svg" alt="Paste" />
              </span>
              
            </div>
          </div>
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
});

export default InputLinkComponent;
