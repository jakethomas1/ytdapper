interface ErrorIconProps {
  error?: string;
  onClick?: () => void;
}

export default function ErrorIcon({ error, onClick }: ErrorIconProps) {
  if (!error) return null;

  return (
    <div 
      className="error-icon-container" 
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      <svg className="error-icon" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
      </svg>
      <span className="error-tooltip">{error}</span>
    </div>
  );
}