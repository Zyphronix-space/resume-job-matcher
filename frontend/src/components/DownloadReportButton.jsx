import { downloadReport } from '../utils/report.js'

export default function DownloadReportButton({ result, meta }) {
  return (
    <button
      type="button"
      className="new-analysis-btn download-report-btn"
      onClick={() => downloadReport(result, meta || {})}
    >
      Download report
    </button>
  )
}
