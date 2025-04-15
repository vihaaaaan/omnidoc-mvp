import { useState, useEffect } from 'react';
import { useParams, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import MainLayout from '@/components/layout/MainLayout';
import SessionsList from '@/components/sessions/SessionsList';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, PlusCircle } from 'lucide-react';
import { getPatientById, getSessionsWithReportsByPatientId } from '@/lib/supabase';
import type { Patient, SessionWithReport } from '@/types';

const PatientDetail = () => {
  const { id } = useParams();
  
  // Fetch patient data
  const { 
    data: patient, 
    isLoading: isLoadingPatient,
    error: patientError
  } = useQuery({
    queryKey: [`/api/patients/${id}`],
    queryFn: async () => {
      if (!id) return null;
      const patientData = await getPatientById(id);
      return patientData as Patient;
    }
  });

  // Fetch sessions with reports
  const { 
    data: sessions, 
    isLoading: isLoadingSessions,
    error: sessionsError
  } = useQuery({
    queryKey: [`/api/patients/${id}/sessions`],
    queryFn: async () => {
      if (!id) return [];
      const sessionsData = await getSessionsWithReportsByPatientId(id);
      return sessionsData as SessionWithReport[];
    }
  });

  const isLoading = isLoadingPatient || isLoadingSessions;
  const error = patientError || sessionsError;

  return (
    <MainLayout>
      {/* Patient Detail Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <Link href="/dashboard" className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700 mb-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
          </Link>
          
          {isLoadingPatient ? (
            <>
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64 mt-1" />
            </>
          ) : patient ? (
            <>
              <h1 className="text-2xl font-bold text-gray-900">{patient.full_name}</h1>
              <p className="mt-1 text-sm text-gray-600">
                Patient #{patient.id.substring(0, 8)} • Added on {new Date(patient.created_at).toLocaleDateString()}
              </p>
            </>
          ) : (
            <p className="text-red-500">Patient not found</p>
          )}
        </div>
        
        {!isLoading && patient && (
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="text-gray-700">
              <Edit className="h-4 w-4 mr-2" />
              Edit Patient
            </Button>
            <Button size="sm" className="bg-primary-600 hover:bg-primary-700 text-white">
              <PlusCircle className="h-4 w-4 mr-2" />
              New Session
            </Button>
          </div>
        )}
      </div>

      {/* Patient Information Card */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">Patient Information</h2>
          <Button variant="ghost" size="sm" className="text-primary-600 hover:text-primary-700 p-1 h-8 w-8">
            <Edit className="h-4 w-4" />
          </Button>
        </div>
        
        {isLoadingPatient ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, index) => (
              <div key={index}>
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-6 w-40" />
              </div>
            ))}
          </div>
        ) : patient ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">Full Name</p>
              <p className="font-medium">{patient.full_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Email Address</p>
              <p className="font-medium">{patient.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Phone Number</p>
              <p className="font-medium">{patient.phone_number}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Date of Birth</p>
              <p className="font-medium">{patient.dob}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Gender</p>
              <p className="font-medium">{patient.gender || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Address</p>
              <p className="font-medium">{patient.address || 'Not specified'}</p>
            </div>
          </div>
        ) : (
          <p className="text-red-500">Error loading patient information</p>
        )}
      </div>

      {/* Sessions List */}
      {error ? (
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-red-500">Error loading data: {(error as Error).message}</p>
        </div>
      ) : (
        <SessionsList 
          sessions={sessions || []} 
          isLoading={isLoadingSessions}
        />
      )}
    </MainLayout>
  );
};

export default PatientDetail;
