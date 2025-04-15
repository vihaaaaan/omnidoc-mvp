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

// ShareSessionContent component for the dialog
interface ShareSessionContentProps {
  session: any;
  patientEmail: string;
  patientName: string;
}

const ShareSessionContent = ({ session, patientEmail, patientName }: ShareSessionContentProps) => {
  const [copied, setCopied] = useState(false);
  const [emailTo, setEmailTo] = useState(patientEmail || '');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [activeTab, setActiveTab] = useState('link');
  
  // Generate a unique token - in a real app, this would be stored in the database
  // Here we're just creating a simple hash of the session ID for demo purposes
  const generateUniqueToken = () => {
    return btoa(session.id).substring(0, 12);
  };
  
  const sessionLink = `${window.location.origin}/session/${session.id}/${generateUniqueToken()}`;
  
  // Copy to clipboard function
  const copyToClipboard = () => {
    navigator.clipboard.writeText(sessionLink);
    setCopied(true);
    toast({
      title: "Link copied!",
      description: "The session link has been copied to your clipboard.",
    });
    
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };
  
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="link" className="flex items-center">
          <Copy className="h-4 w-4 mr-2" />
          Copy Link
        </TabsTrigger>
        <TabsTrigger value="email" className="flex items-center">
          <Mail className="h-4 w-4 mr-2" />
          Send Email
        </TabsTrigger>
      </TabsList>
      
      {/* Copy Link Tab */}
      <TabsContent value="link">
        <div className="flex items-center space-x-2 mt-2">
          <div className="grid flex-1 gap-2">
            <div className="border rounded-md p-3 bg-gray-50 text-sm font-mono break-all">
              {sessionLink}
            </div>
            <p className="text-xs text-muted-foreground">
              This link will allow anyone to access the session and participate.
            </p>
          </div>
          <Button 
            type="button" 
            size="sm" 
            className="px-3" 
            onClick={copyToClipboard}
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            <span className="sr-only">Copy</span>
          </Button>
        </div>
      </TabsContent>
      
      {/* Email Tab */}
      <TabsContent value="email">
        <div className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="email">Patient Email</Label>
            <Input
              id="email" 
              type="email" 
              placeholder="patient@example.com" 
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
            />
          </div>
          <Button 
            type="button" 
            className="w-full"
            disabled={!emailTo || isSendingEmail}
            onClick={async () => {
              if (!emailTo) return;
              
              setIsSendingEmail(true);
              
              try {
                const token = generateUniqueToken();
                const result = await sendSessionLinkEmail(
                  emailTo,
                  session.id,
                  token,
                  patientName,
                  'Dr. Smith' // Ideally this would be the actual doctor name
                );
                
                if (result.success) {
                  toast({
                    title: "Email sent successfully",
                    description: `The session link has been sent to ${emailTo}`,
                  });
                  // Don't clear the email field if it's the patient's email
                  if (emailTo !== patientEmail) {
                    setEmailTo('');
                  }
                } else {
                  toast({
                    variant: "destructive",
                    title: "Failed to send email",
                    description: result.message,
                  });
                }
              } catch (error) {
                toast({
                  variant: "destructive",
                  title: "Error",
                  description: `Failed to send email: ${error instanceof Error ? error.message : String(error)}`,
                });
              } finally {
                setIsSendingEmail(false);
              }
            }}
          >
            {isSendingEmail ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Send Email
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            This will send an email containing the session link directly to the patient's email address.
          </p>
        </div>
      </TabsContent>
    </Tabs>
  );
};

const PatientDetail = () => {
  const params = useParams();
  const { id } = params;
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  console.log('Patient detail page rendered with id:', id, 'params:', params);
  
  // State for session modal
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [currentSession, setCurrentSession] = useState<any>(null);
  
  // Create new session function - using direct function call for better reliability
  const handleCreateSession = async () => {
    if (!id) {
      toast({
        title: 'Error',
        description: 'Patient ID is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      console.log('Creating new session for patient:', id);
      // Call the createSession function directly
      const newSession = await createSession(id);
      console.log('Session created successfully:', newSession);
      
      toast({
        title: 'New Session Created',
        description: 'You can now share the session link with the patient.',
      });
      
      // Save the session and show the share dialog
      setCurrentSession(newSession);
      setShowShareDialog(true);
      
    } catch (error) {
      console.error('Failed to create session:', error);
      toast({
        title: 'Error Creating Session',
        description: (error instanceof Error) ? error.message : 'Failed to create new session',
        variant: 'destructive',
      });
    }
  };

  // Create new session mutation (keeping this for API pattern consistency)
  const createSessionMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('Patient ID is required');
      return await createSession(id);
    },
    onSuccess: (session) => {
      console.log('Session created successfully with mutation:', session);
      toast({
        title: 'New Session Created',
        description: 'You can now share the session link with the patient.',
      });
      
      // Save the session and show the share dialog
      setCurrentSession(session);
      setShowShareDialog(true);
    },
    onError: (error) => {
      console.error('Failed to create session with mutation:', error);
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
            
            {/* New Session Button - Using direct function call for reliability */}
            <Button 
              onClick={handleCreateSession}
              className="h-9 px-3 inline-flex items-center bg-primary-600 hover:bg-primary-700 text-white font-medium text-sm"
            >
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
          onSessionCreated={(session) => {
            // When a session is created from the SessionsList component
            setCurrentSession(session);
            setShowShareDialog(true);
          }}
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