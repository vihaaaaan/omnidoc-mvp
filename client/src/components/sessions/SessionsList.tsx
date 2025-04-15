import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle } from 'lucide-react';
import SessionRow from './SessionRow';
import EmptySessionState from './EmptySessionState';
import ReportDetail from '../reports/ReportDetail';
import type { SessionWithReport } from '@/types';

interface SessionsListProps {
  sessions: SessionWithReport[];
  isLoading: boolean;
}

const SessionsList = ({ sessions, isLoading }: SessionsListProps) => {
  const [activeTab, setActiveTab] = useState('all');
  const [selectedSession, setSelectedSession] = useState<SessionWithReport | null>(null);

  // Filter sessions based on tab
  const filteredSessions = sessions.filter(session => {
    if (activeTab === 'all') return true;
    return session.status === activeTab;
  });

  // Handle view report button click
  const handleViewReport = (session: SessionWithReport) => {
    setSelectedSession(session);
  };

  // Handle close report
  const handleCloseReport = () => {
    setSelectedSession(null);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-medium text-gray-900">Sessions & Reports</h2>
        <Button className="px-4 py-2 text-sm text-primary-600 bg-primary-50 hover:bg-primary-100">
          <PlusCircle className="h-4 w-4 mr-2" />
          New Session
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="mb-6" onValueChange={setActiveTab}>
        <TabsList className="border-b border-gray-200 mb-6 space-x-4">
          <TabsTrigger 
            value="all" 
            className="px-4 py-2 text-sm font-medium data-[state=active]:text-primary-600 data-[state=active]:border-b-2 data-[state=active]:border-primary-600"
          >
            All Sessions
          </TabsTrigger>
          <TabsTrigger 
            value="completed" 
            className="px-4 py-2 text-sm font-medium data-[state=active]:text-primary-600 data-[state=active]:border-b-2 data-[state=active]:border-primary-600"
          >
            Completed
          </TabsTrigger>
          <TabsTrigger 
            value="pending" 
            className="px-4 py-2 text-sm font-medium data-[state=active]:text-primary-600 data-[state=active]:border-b-2 data-[state=active]:border-primary-600"
          >
            Pending
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="overflow-x-auto">
          {filteredSessions.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Session ID</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Report</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSessions.map(session => (
                  <SessionRow 
                    key={session.id} 
                    session={session} 
                    onViewReport={handleViewReport} 
                  />
                ))}
              </tbody>
            </table>
          ) : (
            <EmptySessionState />
          )}
        </TabsContent>
      </Tabs>

      {/* Report Detail Section - Shown when a report is selected */}
      {selectedSession && selectedSession.report && (
        <ReportDetail 
          session={selectedSession} 
          report={selectedSession.report} 
          onClose={handleCloseReport}
        />
      )}
    </div>
  );
};

export default SessionsList;
