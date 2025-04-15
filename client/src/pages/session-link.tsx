import { useParams, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Loader2, ArrowLeft } from 'lucide-react';

const SessionLink = () => {
  const { sessionId, token } = useParams();
  
  console.log('Session link page loaded with sessionId:', sessionId, 'and token:', token);
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-5">
      <div className="bg-white shadow-md rounded-xl p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-center mb-6">Patient Session</h1>
        
        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            This is a placeholder for the session link page that will allow patients to participate in a voice conversation and get their report filled out.
          </p>
          
          <div className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50">
            <p className="text-sm text-gray-500 mb-1">Session ID:</p>
            <p className="font-medium">{sessionId}</p>
          </div>
          
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <p className="text-sm text-gray-500 mb-1">Verification Token:</p>
            <p className="font-medium">{token}</p>
          </div>
        </div>
        
        <div className="text-center">
          <Link href="/" className="text-primary-600 hover:text-primary-800 font-medium">
            Return to home page
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SessionLink;