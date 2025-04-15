import { useState, useEffect } from 'react';
import PatientCard from './PatientCard';
import EmptyState from './EmptyState';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, UserPlus } from 'lucide-react';
import type { Patient } from '@/types';

interface PatientsListProps {
  patients: Patient[];
  isLoading: boolean;
}

const PatientsList = ({ patients, isLoading }: PatientsListProps) => {
  console.log('PatientsList rendering with', patients.length, 'patients, isLoading:', isLoading);
  
  useEffect(() => {
    console.log('PatientsList updated with patients:', patients);
  }, [patients]);
  
  const [searchQuery, setSearchQuery] = useState('');

  // Filter patients based on search query
  const filteredPatients = patients.filter(patient => 
    patient.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.phone_number.includes(searchQuery)
  );

  return (
    <div>
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div className="flex-grow max-w-md">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search patients..."
              className="w-full pl-10 pr-4 py-2"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-gray-400" />
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="text-gray-700">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button size="sm" className="bg-primary-600 hover:bg-primary-700 text-white">
            <UserPlus className="h-4 w-4 mr-2" />
            Add Patient
          </Button>
        </div>
      </div>

      {/* Patients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {!isLoading && filteredPatients.length > 0 ? (
          filteredPatients.map(patient => (
            <PatientCard key={patient.id} patient={patient} />
          ))
        ) : !isLoading && filteredPatients.length === 0 ? (
          <EmptyState />
        ) : null}
      </div>

      {/* Pagination - can be extended later */}
      {filteredPatients.length > 0 && (
        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 sm:px-6 mt-4 bg-white rounded-lg shadow-sm">
          <div className="flex-1 flex justify-between sm:hidden">
            <Button variant="outline" size="sm">
              Previous
            </Button>
            <Button variant="outline" size="sm" className="ml-3">
              Next
            </Button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">1</span> to <span className="font-medium">{filteredPatients.length}</span> of{' '}
                <span className="font-medium">{filteredPatients.length}</span> results
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientsList;
