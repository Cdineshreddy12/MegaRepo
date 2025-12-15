import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const LEAD_SOURCES = [
  "website",
  "referral",
  "social_media",
  "email_campaign",
  "trade_show",
  "cold_call",
  "other",
];

const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "closed_won",
  "closed_lost",
];

const ConversationalLeadForm = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company_name: '',
    job_title: '',
    lead_source: '',
    status: 'new',
    lead_score: '',
    notes: ''
  });

  const [messages, setMessages] = useState([
    {
      id: '1',
      type: 'bot',
      content: "Hi! I'll help you create a new lead. What's the person's first name?"
    }
  ]);

  const questions = [
    {
      field: 'first_name',
      question: "What's the person's first name?",
      validation: (value) => value.length > 0,
      errorMessage: 'First name is required'
    },
    {
      field: 'last_name',
      question: `Nice to meet ${formData.first_name}! What's their last name?`,
      validation: (value) => value.length > 0,
      errorMessage: 'Last name is required'
    },
    {
      field: 'email',
      question: 'What email address can they be reached at?',
      validation: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      errorMessage: 'Please enter a valid email address'
    },
    {
      field: 'phone',
      question: 'What about their phone number?',
      validation: (value) => value.length >= 10,
      errorMessage: 'Please enter a valid phone number'
    },
    {
      field: 'company_name',
      question: 'Which company do they work for?',
      validation: (value) => value.length > 0,
      errorMessage: 'Company name is required'
    },
    {
      field: 'job_title',
      question: `What's their role at ${formData.company_name}?`,
      validation: (value) => true
    },
    {
      field: 'lead_source',
      question: 'How did they find us?',
      type: 'select',
      options: LEAD_SOURCES,
      validation: (value) => LEAD_SOURCES.includes(value),
      errorMessage: 'Please select a valid lead source'
    },
    {
      field: 'lead_score',
      question: 'On a scale of 0-100, how would you rate their potential?',
      validation: (value) => !value || (parseInt(value) >= 0 && parseInt(value) <= 100),
      errorMessage: 'Please enter a number between 0 and 100'
    },
    {
      field: 'notes',
      question: 'Any additional notes you want to add?',
      type: 'textarea',
      validation: (value) => true
    }
  ];

  const addMessage = (type, content) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      type,
      content
    }]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const currentQuestion = questions[currentStep];
    if (!currentQuestion.validation(userInput)) {
      addMessage('bot', currentQuestion.errorMessage);
      return;
    }

    setFormData(prev => ({
      ...prev,
      [currentQuestion.field]: userInput
    }));

    addMessage('user', userInput);

    if (currentStep < questions.length - 1) {
      const nextQuestion = questions[currentStep + 1];
      addMessage('bot', nextQuestion.question);
      setCurrentStep(currentStep + 1);
      setUserInput('');
    } else {
      addMessage('bot', 'Great! I have all the information I need. Creating the lead...');
      onComplete(formData);
    }
  };

  const renderInput = () => {
    const currentQuestion = questions[currentStep];
    
    if (currentQuestion.type === 'select') {
      return (
        <select 
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          className="w-full p-2 border rounded-md"
        >
          <option value="">Select an option</option>
          {currentQuestion.options.map(option => (
            <option key={option} value={option}>
              {option.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </option>
          ))}
        </select>
      );
    }
    
    if (currentQuestion.type === 'textarea') {
      return (
        <Textarea
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Type your response..."
          className="w-full"
        />
      );
    }
    
    return (
      <Input
        type={currentQuestion.field === 'email' ? 'email' : 'text'}
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        placeholder="Type your response..."
        className="w-full"
      />
    );
  };

  return (
    <div className="space-y-4 w-full">
      <div className="space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex",
              message.type === "user" ? "justify-end" : "justify-start"
            )}
          >
            <Card
              className={cn(
                "w-full p-3",
                message.type === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              )}
            >
              {message.content}
            </Card>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        {renderInput()}
        <Button type="submit">
          {currentStep === questions.length - 1 ? 'Finish' : 'Next'}
        </Button>
      </form>
    </div>
  );
};

export default ConversationalLeadForm;