import { UserSearch, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

const EmptyState = () => {
  return (
    <div className="col-span-full bg-white rounded-xl shadow-sm p-8 text-center">
      <div className="flex flex-col items-center justify-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary-50 text-primary-600 mb-4">
          <UserSearch className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No patients found</h3>
        <p className="text-sm text-gray-500 mb-6 max-w-sm">
          You don't have any patients in your database yet. Add a new patient to get started.
        </p>
        <Button className="bg-primary-600 hover:bg-primary-700 text-white">
          <UserPlus className="h-4 w-4 mr-2" />
          Add New Patient
        </Button>
      </div>
    </div>
  );
};

export default EmptyState;
