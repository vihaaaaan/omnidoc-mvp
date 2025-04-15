import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import MainLayout from '@/components/layout/MainLayout';
import { getPatients, createSession } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, ChevronLeft } from 'lucide-react';
import { Patient } from '@/types';

const CreateSession = () => {
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [_, setLocation] = useLocation();
  const { toast } = useToast();

  // Fetch patients list
  const { data: patients, isLoading } = useQuery<Patient[]>({
    queryKey: ['/api/patients'],
    queryFn: async () => {
      try {
        return await getPatients();
      } catch (error) {
        console.error('Failed to fetch patients:', error);
        throw error;
      }
    },
  });

  const handleCreateSession = async () => {
    if (!selectedPatientId) {
      toast({
        title: 'Error',
        description: 'Please select a patient first',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    
    try {
      // Show loading toast
      toast({
        title: 'Creating new session...',
        description: 'Please wait while we set up the session.',
      });
      
      const session = await createSession(selectedPatientId);
      console.log('Session created successfully:', session);
      
      // Success toast
      toast({
        title: 'Success!',
        description: 'New session created successfully.',
      });
      
      // Redirect to the session page
      setTimeout(() => {
        setLocation(`/session/${session.id}`);
      }, 1000);
      
    } catch (error) {
      console.error('Failed to create session:', error);
      toast({
        title: 'Error',
        description: 'Failed to create session. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <MainLayout>
      <div className="container max-w-5xl py-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Create New Session</h1>
            <p className="text-gray-500 mt-1">Create a new medical interview session for a patient</p>
          </div>
          <Button variant="outline" onClick={() => setLocation('/dashboard')}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        <Card className="w-full">
          <CardHeader>
            <CardTitle>New Patient Session</CardTitle>
            <CardDescription>
              Select a patient to start a new medical screening interview session
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Select Patient</label>
                {isLoading ? (
                  <div className="flex items-center space-x-2 h-10">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm text-gray-500">Loading patients...</span>
                  </div>
                ) : (
                  <Select
                    value={selectedPatientId || undefined}
                    onValueChange={(value) => setSelectedPatientId(value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a patient" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients && patients.length > 0 ? (
                        patients.map((patient) => (
                          <SelectItem key={patient.id} value={patient.id}>
                            {patient.full_name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-patients" disabled>
                          No patients found
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}
                {patients && patients.length === 0 && (
                  <p className="text-sm text-red-500 mt-2">No patients found in the system</p>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setLocation('/dashboard')}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateSession}
              disabled={isCreating || !selectedPatientId}
              className="bg-primary-600 hover:bg-primary-700"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Session
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </MainLayout>
  );
};

export default CreateSession;