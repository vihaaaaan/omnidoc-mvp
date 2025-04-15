import { format } from 'date-fns';
import { Edit, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SessionWithReport } from '@/types';

interface SessionRowProps {
  session: SessionWithReport;
  onViewReport: (session: SessionWithReport) => void;
}

const SessionRow = ({ session, onViewReport }: SessionRowProps) => {
  // Format the started_at date
  const formattedDate = session.started_at 
    ? format(new Date(session.started_at), 'MMM d, yyyy')
    : 'N/A';

  // Render the status badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
            Completed
          </span>
        );
      case 'pending':
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
            Pending
          </span>
        );
      case 'in-progress':
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
            In Progress
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
        {session.id.substring(0, 8)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {formattedDate}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {renderStatusBadge(session.status)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {session.status === 'completed' ? (
          <Button
            variant="link"
            onClick={() => onViewReport(session)}
            className="text-primary-600 hover:text-primary-700 p-0"
          >
            View Report
          </Button>
        ) : (
          "-"
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-500 h-8 w-8 p-0 mr-1">
          <Edit className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-500 h-8 w-8 p-0">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  );
};

export default SessionRow;
