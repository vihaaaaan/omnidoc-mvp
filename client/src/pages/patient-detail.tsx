import { useState } from 'react';
import { useParams, Link, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import MainLayout from '@/components/layout/MainLayout';
import SessionsList from '@/components/sessions/SessionsList';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Edit, PlusCircle, Loader2, Copy, Check, Mail, LinkIcon } from 'lucide-react';
import { getPatientById, getSessionsWithReportsByPatientId, createSession } from '@/lib/supabase';
import { sendSessionLinkEmail } from '@/lib/email-service';
import { useToast } from '@/hooks/use-toast';
import { toast } from '@/hooks/use-toast';
import type { Patient, SessionWithReport } from '@/types';

const PatientDetail = () => {
  const params = useParams();
  const { id } = params;
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  console.log('Patient detail page rendered with id:', id, 'params:', params);
  
  // State for session modal
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [currentSession, setCurrentSession] = useState<any>(null);
  
  // Create new session mutation
  const createSessionMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('Patient ID is required');
      return await createSession(id);
    },
    onSuccess: (session) => {
      console.log('Session created successfully:', session);
      toast({
        title: 'New Session Created',
        description: 'You can now share the session link with the patient.',
      });
      
      // Save the session and show the share dialog
      setCurrentSession(session);
      setShowShareDialog(true);
    },
    onError: (error) => {
      console.error('Failed to create session:', error);
      toast({
        title: 'Error Creating Session',
        description: (error as Error).message || 'Failed to create new session',
        variant: 'destructive',
      });
    }
  });
  
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
            
            {/* New Session Button */}
            <Button 
              onClick={() => {
                console.log('New Session button clicked');
                createSessionMutation.mutate();
              }}
              className="h-9 px-3 inline-flex items-center bg-primary-600 hover:bg-primary-700 text-white font-medium text-sm"
              disabled={createSessionMutation.isPending}
            >
              {createSessionMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <PlusCircle className="h-4 w-4 mr-2" />
              )}
              {createSessionMutation.isPending ? 'Creating...' : 'New Session'}
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
      
      {/* Share Session Link Dialog */}
      {currentSession && (
        <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Share Session Link</DialogTitle>
              <DialogDescription>
                Share this link with the patient to allow them to participate in the session.
              </DialogDescription>
            </DialogHeader>
            
            <ShareSessionContent 
              session={currentSession} 
              patientEmail={patient?.email || ''}
              patientName={patient?.full_name || 'Patient'}
            />
            
            <DialogFooter className="sm:justify-start">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowShareDialog(false);
                }}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </MainLayout>
  );
};

export default PatientDetail;
