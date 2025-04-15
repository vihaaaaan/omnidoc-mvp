import { format } from "date-fns";
import { Printer, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Report, SessionWithReport } from "@/types";

interface ReportDetailProps {
  session: SessionWithReport;
  report: Report;
  onClose: () => void;
}

const ReportDetail = ({ session, report, onClose }: ReportDetailProps) => {
  const formattedDate = session.started_at
    ? format(new Date(session.started_at), "MMM d, yyyy")
    : "N/A";

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mt-6 border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center">
            <h2 className="text-lg font-medium text-gray-900">
              Report Details
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="ml-2 text-gray-400 hover:text-gray-500 h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Session #{session.id.substring(0, 8)} on {formattedDate}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="text-gray-700">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm" className="text-gray-700">
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </div>

      {/* Report Summary */}
      {report.summary && (
        <div className="mb-6 p-6 bg-gray-50 rounded-lg border border-gray-100">
          <h3 className="text-md font-medium text-gray-900 mb-3">Medical Summary</h3>
          <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-line">
            {report.summary}
          </p>
        </div>
      )}

      {/* Report Data */}
      {report.json_schema && Object.keys(report.json_schema).length > 0 && (
        <div>
          <h3 className="text-md font-medium text-gray-900 mb-4">
            Examination Data
          </h3>

          {/* JSON Schema rendering as key-value pairs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            {Object.entries(report.json_schema).map(([key, value]) => (
              <div key={key} className="bg-white p-4 rounded-md border border-gray-100 shadow-sm">
                <p className="text-sm font-semibold text-primary-600 mb-2">
                  {key
                    .split("_")
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(" ")}
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">{value as string}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportDetail;
