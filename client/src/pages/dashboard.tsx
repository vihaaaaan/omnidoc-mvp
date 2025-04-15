import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import MainLayout from '@/components/layout/MainLayout';
import PatientsList from '@/components/patients/PatientsList';
import { Skeleton } from '@/components/ui/skeleton';
import { getPatients } from '@/lib/supabase';
import type { Patient } from '@/types';

const Dashboard = () => {
  // Fetch patients data
  const { data: patients, isLoading, error } = useQuery({
    queryKey: ['/api/patients'],
    queryFn: async () => {
      const patientsData = await getPatients();
      return patientsData as Patient[];
    }
  });

  return (
    <MainLayout>
      <div>
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Patient Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600">Manage and review your patient information.</p>
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
