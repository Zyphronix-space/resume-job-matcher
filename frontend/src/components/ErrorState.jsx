import { WarningIcon } from './icons.jsx'

const COPY = {
  'bad-request': {
    title: "We couldn't read that resume",
    message: 'Make sure the PDF contains selectable text and try again.',
  },
  network: {
    title: 'Unable to connect',
    message: 'Make sure the FastAPI server is running and try again.',
  },
  server: {
    title: 'Something went wrong',
    message: "We couldn't complete the analysis. Please try again.",
  },
}

export default function ErrorState({ kind, onRetry }) {
  const { title, message } = COPY[kind] || COPY.server

  return (
    <div className="error-state">
      <span className="error-state-icon"><WarningIcon size={30} /></span>
      <h2 className="error-state-title">{title}</h2>
      <p className="error-state-message">{message}</p>
      <button type="button" className="error-state-retry" onClick={onRetry}>Try again</button>
    </div>
  )
}
