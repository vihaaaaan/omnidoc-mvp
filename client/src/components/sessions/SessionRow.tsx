import { format } from "date-fns";
import { useState } from "react";
import { Edit, MoreVertical, Link as LinkIcon, Copy, Check, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { sendSessionLinkEmail } from "@/lib/email-service";
import type { SessionWithReport } from "@/types";

interface SessionRowProps {
  session: SessionWithReport;
  onViewReport: (session: SessionWithReport) => void;
}

const SessionRow = ({ session, onViewReport }: SessionRowProps) => {
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [activeTab, setActiveTab] = useState('link');
  
  // Format the started_at date
  const formattedDate = session.started_at
    ? format(new Date(session.started_at), "MMM d, yyyy")
    : "N/A";
    
  // Generate a unique token - in a real app, this would be stored in the database
  // Here we're just creating a simple hash of the session ID for demo purposes
  const generateUniqueToken = () => {
    return btoa(session.id).substring(0, 12);
  };
  
  const sessionLink = `${window.location.origin}/session/${session.id}/${generateUniqueToken()}`;
  
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

  // Render the status badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
            Completed
          </span>
        );
      case "pending":
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
            Pending
          </span>
        );
      case "in-progress":
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
            In Progress
          </span>
        );
      case "cancelled":
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
        {session.id.substring(0, 8)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {formattedDate}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {renderStatusBadge(session.status)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {session.status === "completed" ? (
          <Button
            variant="link"
            onClick={() => onViewReport(session)}
            className="text-primary-600 hover:text-primary-700 p-0"
          >
            View Report
          </Button>
        ) : (session.status === "pending" || session.status === "in-progress") ? (
          <Button
            variant="link"
            onClick={() => setShowShareDialog(true)}
            className="text-primary-600 hover:text-primary-700 p-0 inline-flex items-center"
          >
            <LinkIcon className="h-3.5 w-3.5 mr-1" />
            Share Link
          </Button>
        ) : (
          "-"
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-gray-500 h-8 w-8 p-0 mr-1"
              >
                <Edit className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Edit Session</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-gray-400 hover:text-gray-500 h-8 w-8 p-0"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>More Options</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </td>
      
      {/* Share Session Link Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Session Link</DialogTitle>
            <DialogDescription>
              Share this link with the patient to allow them to participate in the session.
            </DialogDescription>
          </DialogHeader>
          
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
                        'Patient', // Ideally this would be the actual patient name
                        'Dr. Smith' // Ideally this would be the actual doctor name
                      );
                      
                      if (result.success) {
                        toast({
                          title: "Email simulation successful",
                          description: result.message,
                        });
                        setEmailTo('');
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
                  This will simulate sending an email. In a production environment, this would connect to an email service to deliver the link to the patient.
                </p>
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter className="sm:justify-start">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowShareDialog(false);
                setEmailTo('');
                setActiveTab('link');
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </tr>
  );
};

export default SessionRow;
