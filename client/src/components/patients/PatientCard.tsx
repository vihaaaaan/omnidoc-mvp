import { Link } from 'wouter';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { User2 } from 'lucide-react';
import type { Patient } from '@/types';

interface PatientCardProps {
  patient: Patient;
}

const PatientCard = ({ patient }: PatientCardProps) => {
  // Format the created_at date to "X days ago" format
  const formattedDate = patient.created_at
    ? formatDistanceToNow(new Date(patient.created_at), { addSuffix: true })
    : 'N/A';

  return (
    <Link href={`/patients/${patient.id}`}>
      <Card className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300">
        <CardContent className="p-5">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-gray-900">{patient.full_name}</h3>
              <p className="text-sm text-gray-500 mt-1">{patient.email}</p>
            </div>
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-50 text-primary-600">
              <User2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-gray-500">Phone</p>
                <p className="text-sm font-medium">{patient.phone_number}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Date of Birth</p>
                <p className="text-sm font-medium">{patient.dob}</p>
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-between">
            <span className="text-xs text-gray-500">
              <span className="inline-block mr-1">•</span>
              Added {formattedDate}
            </span>
            <span className="text-xs font-medium text-primary-600">View details →</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default PatientCard;
