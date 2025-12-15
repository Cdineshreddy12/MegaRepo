import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Brain,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Target,
  CheckCircle,
  Zap,
  AlertCircle,
  HelpCircle,
  MessageSquare
} from 'lucide-react';

import Page, { PageHeader, PageFooter } from '@/components/Page';
import { Section } from '@/components/Section';
import { Button } from '@/components/ui/button';
import Loader from '@/components/common/Loader';
import Typography from '@/components/common/Typography';
import { ROUTE_PATH } from '@/constants';
import { useLeadInsights } from '@/queries/useLeadInsights';

const LeadInsightsView = () => {
  const { leadId } = useParams();
  const navigate = useNavigate();
  
  // Safety check: if leadId is invalid, show loading
  if (!leadId || leadId === '' || leadId === 'undefined' || leadId === 'null') {
    return <Loader />;
  }
  
  const [expandedSections, setExpandedSections] = useState({
    executiveSummary: true,
    leadSummary: true,
    salesIntelligence: true,
    conversationStarter: true,
    questionToAsk: true,
    nextBestAction: true
  });

  const { 
    insights, 
    isLoading, 
    isError, 
    error, 
    generateInsights 
  } = useLeadInsights(leadId);

  const isInsightsAvailable = !!insights?.answer;
  console.log('Insights:', insights);

  // Generate insights on component mount if they don't exist
  useEffect(() => {
    if (!insights) {
      generateInsights();
    }
  }, [insights, generateInsights]);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleBackClick = () => {
    navigate(`${ROUTE_PATH.LEAD}/${leadId}/view`);
  };



  if (isError) {
    return (
      <Page
        header={
          <PageHeader 
            title="AI Lead Insights" 
            actions={[
              <Button
                key="back"
                variant="outline"
                onClick={handleBackClick}
              >
                <ArrowLeft className="mr-2" size={16} />
                Back to Lead
              </Button>
            ]}
          />
        }
        footer={
          <PageFooter>
            <Typography variant="body2" className="text-muted-foreground text-center text-xs">
              Error generating insights
            </Typography>
          </PageFooter>
        }
      >
        <div className="flex flex-col items-center justify-center py-12">
          <div className="text-red-500 mb-4">
            <AlertCircle className="w-12 h-12" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">Failed to generate insights</h3>
          <p className="mt-2 text-sm text-gray-500">
            {error instanceof Error ? error.message : 'An unknown error occurred'}
          </p>
          <Button onClick={() => generateInsights()} className="mt-4">
            Try Again
          </Button>
        </div>
      </Page>
    );
  }

  // Simple placeholder sections to avoid complex mappings that might cause errors
  return (
    <Page
      header={
        <PageHeader 
          title="AI Lead Insights" 
          actions={[
            <Button
              key="refresh"
              variant="secondary"
              onClick={() => generateInsights()}
            >
              <Brain className="mr-2" size={16} />
              Regenerate
            </Button>,
            <Button
              key="back"
              variant="outline"
              onClick={handleBackClick}
            >
              <ArrowLeft className="mr-2" size={16} />
              Back to Lead
            </Button>
          ]}
        />
      }
      footer={
        <PageFooter>
          <Typography variant="body2" className="text-muted-foreground text-center text-xs">
            {insights ? "AI insights generated successfully" : "No insights available"}
          </Typography>
        </PageFooter>
      }
    >

      {/* loader */}
      {isLoading &&  
      
            <div className="flex flex-col items-center justify-center h-full py-8">
              <div className="loader mb-4"></div>
              <p className="text-gray-600 text-sm font-medium animate-pulse">Generating AI Insights...</p>
            </div>
    }
        
      {insights && (
        <div className="space-y-6">
          <Section title="Executive Summary">
            <div className="p-4 bg-amber-50 rounded-md">
              <p className="text-gray-800">{insights.answer.executive_summary}</p>
            </div>
          </Section>
          
          <Section title="Lead Summary">
            <div className="p-4 bg-blue-50 rounded-md">
              <p className="text-gray-800">{insights.answer.lead_summary}</p>
            </div>
          </Section>
          
          <Section title="Sales Intelligence">
            <div className="p-4 bg-purple-50 rounded-md">
              <p className="text-gray-800">{insights.answer.sales_intelligence}</p>
            </div>
          </Section>
          
          <Section title="Conversation Starter">
            <div className="p-4 bg-green-50 rounded-md">
              <p className="text-gray-800">{insights.answer.conversation_starter}</p>
            </div>
          </Section>
          
          <Section title="Questions to Ask">
            <div className="p-4 bg-yellow-50 rounded-md">
              <p className="text-gray-800">{insights.answer.question_to_ask}</p>
            </div>
          </Section>
          
          <Section title="Next Best Action">
            <div className="p-4 bg-green-50 rounded-md">
              <p className="text-gray-800">{insights.answer.next_best_action}</p>
            </div>
          </Section>
        </div>
      )}
    </Page>
  );
};

export default LeadInsightsView;