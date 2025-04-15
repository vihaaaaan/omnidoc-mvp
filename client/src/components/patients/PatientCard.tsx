import { useLocation } from 'wouter';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User2, Video, PlusCircle } from 'lucide-react';
import { createSession } from '@/lib/supabase'; 
import { useToast } from '@/hooks/use-toast';
import type { Patient } from '@/types';

interface PatientCardProps {
  patient: Patient;
}

const PatientCard = ({ patient }: PatientCardProps) => {
  console.log('Rendering PatientCard for patient:', patient);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Format the created_at date to "X days ago" format
  const formattedDate = patient.created_at
    ? formatDistanceToNow(new Date(patient.created_at), { addSuffix: true })
    : 'N/A';

  const handleClick = (event: React.MouseEvent) => {
    event.preventDefault();
    const url = `/patients/${patient.id}`;
    console.log('Card clicked, navigating to:', url);
    navigate(url);
  };
  
  // Handle session button click - navigate to patient detail page
  const handleCreateSession = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent clicking through to the card
    
    console.log('Navigate to patient detail page:', patient.id);
    
    // Simply navigate to the patient detail page
    navigate(`/patients/${patient.id}`);
    
    // Show a toast message to guide the user
    toast({
      title: 'Patient Details',
      description: 'Use the "New Session" button to create a session and share the link',
    });
  };

  return (
    <div onClick={handleClick}>
      <Card className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 cursor-pointer">
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
          {/* Session Button */}
          <div className="mt-4 w-full">
            <Button 
              variant="outline"
              size="sm"
              className="w-full text-primary-600 border-primary-200 hover:bg-primary-50 flex items-center justify-center"
              onClick={handleCreateSession}
            >
              <User2 className="h-4 w-4 mr-2" />
              View Patient
            </Button>
          </div>
          
          <div className="mt-3 flex justify-between">
            <span className="text-xs text-gray-500">
              <span className="inline-block mr-1">•</span>
              Added {formattedDate}
            </span>
            <span className="text-xs font-medium text-primary-600">View details →</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PatientCard;
