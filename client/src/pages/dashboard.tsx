import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import MainLayout from '@/components/layout/MainLayout';
import PatientsList from '@/components/patients/PatientsList';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { getPatients } from '@/lib/supabase';
import type { Patient } from '@/types';

const Dashboard = () => {
  console.log('Dashboard component rendering');
  const [_, setLocation] = useLocation();
  
  // Fetch patients data
  const { data: patients, isLoading, error } = useQuery({
    queryKey: ['/api/patients'],
    queryFn: async () => {
      console.log('Fetching patients data');
      try {
        const patientsData = await getPatients();
        console.log('Patient data fetched successfully:', patientsData);
        return patientsData as Patient[];
      } catch (err) {
        console.error('Error fetching patients:', err);
        throw err;
      }
    }
  });

  return (
    <MainLayout>
      <div>
        {/* Page Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Patient Dashboard</h1>
            <p className="mt-1 text-sm text-gray-600">Manage and review your patient information.</p>
          </div>
          <Button 
            onClick={() => setLocation('/create-session')}
            className="bg-primary-600 hover:bg-primary-700 text-white"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Create New Session
          </Button>
        </div>

        {/* Patients List with Loading State */}
        {isLoading ? (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
              <Skeleton className="h-10 w-full max-w-md" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-32" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, index) => (
                <Skeleton key={index} className="h-48 w-full rounded-xl" />
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 p-4 rounded-md">
            <p className="text-red-500">Error loading patients: {(error as Error).message}</p>
          </div>
        ) : (
          <PatientsList patients={patients || []} isLoading={isLoading} />
        )}
      </div>
    </MainLayout>
  );
};

export default Dashboard;
