import { Calendar, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const EmptySessionState = () => {
  return (
    <div className="px-6 py-10 text-center">
      <div className="flex flex-col items-center justify-center">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary-50 text-primary-600 mb-4">
          <Calendar className="h-6 w-6" />
        </div>
        <h3 className="text-base font-medium text-gray-900 mb-1">No sessions found</h3>
        <p className="text-sm text-gray-500 mb-4">This patient doesn't have any sessions yet.</p>
        <Button className="px-3 py-1.5 text-xs text-white bg-primary-600 hover:bg-primary-700">
          <PlusCircle className="h-3 w-3 mr-1" />
          Create New Session
        </Button>
      </div>
    </div>
  );
};

export default EmptySessionState;
