import { useState, useRef, useEffect } from "react";
import {
  MessageCircle,
  UserPlus,
  Building2,
  Target,
  ClipboardList,
  Send,
  Bot,
  Calendar,
  BarChart3,
  ShoppingCart,
  HelpCircle,
  RefreshCw,
  ChevronDown,
  AlertCircle,
  RotateCw,
  BotIcon,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/useToast";
import ConversationalLeadForm from "./ChatbotForm";
import aiAgentService from "@/services/api/aiAgentService";
import ReactMarkdown from "react-markdown";

type Message = {
  id: string;
  type: "bot" | "user";
  content: string | React.ReactNode;
  rawContent?: string;
  sequenceNumber?: number;
  timestamp?: Date;
  isError?: boolean;
  originalQuery?: string; // Store the original query for retry functionality
};

type Entity =
  | "lead"
  | "contact"
  | "account"
  | "opportunity"
  | "task"
  | "event"
  | "product"
  | "report"
  | "ai-query"
  | null;

// Default questions to show as quick access buttons
const DEFAULT_QUESTIONS = [
  "What are my top 3 opportunities by revenue?",
  "Provide me the  created lead information?",
  "Give me the latest closed won opportunity information",
];

// Custom component to render markdown with proper styling
const FormattedMarkdown = ({ content }: { content: string }) => {
  return (
    <div className="markdown-content prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-xl font-bold mt-4 mb-2">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-semibold mt-3 mb-2">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-md font-semibold mt-2 mb-1">{children}</h3>
          ),
          p: ({ children }) => <p className="mb-2">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc ml-4 mb-2">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal ml-4 mb-2">{children}</ol>
          ),
          li: ({ children }) => <li className="mb-1">{children}</li>,
          a: ({ children, ...props }) => (
            <a
              className="text-blue-500 underline"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-gray-300 pl-2 italic my-2">
              {children}
            </blockquote>
          ),
          code: ({ inline, children }) =>
            inline ? (
              <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
                {children}
              </code>
            ) : (
              <pre className="bg-gray-100 dark:bg-gray-800 p-2 rounded my-2 overflow-x-auto">
                <code>{children}</code>
              </pre>
            ),
          hr: () => <hr className="my-4 border-gray-300" />,
          table: ({ children }) => (
            <div className="overflow-x-auto my-2">
              <table className="min-w-full border-collapse">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="p-2 border border-gray-300 font-semibold bg-gray-100 dark:bg-gray-800">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="p-2 border border-gray-300">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

function EnhancedChatbot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "bot",
      content:
        "Hello! I'm your CRM Assistant. I can help with various tasks like analyzing leads, providing insights, creating records, and answering questions about your business data. What would you like to do today?",
      sequenceNumber: 0,
      timestamp: new Date(),
    },
  ]);
  const [selectedEntity, setSelectedEntity] = useState<Entity>(null);
  const [aiInputValue, setAiInputValue] = useState("");
  const [aiSessionId, setAiSessionId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedTextArea, setExpandedTextArea] = useState(false);
  const [sequenceCounter, setSequenceCounter] = useState(1);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [shouldAutoSubmit, setShouldAutoSubmit] = useState(false);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const aiInputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom("smooth");
  }, [messages]);

  // Fixed useEffect to only auto-submit when the shouldAutoSubmit flag is true
  useEffect(() => {
    if (selectedEntity === "ai-query" && aiInputValue && shouldAutoSubmit) {
      handleAiSubmit();
      // Reset the flag after submission
      setShouldAutoSubmit(false);
    }
  }, [aiInputValue, selectedEntity, shouldAutoSubmit]);

  // Check if user is at the bottom of the scroll area
  const handleScroll = (e: any) => {
    const container = e.target;
    const isAtBottom =
      container.scrollHeight - container.scrollTop <=
      container.clientHeight + 100;
    setShowScrollButton(!isAtBottom);
  };

  // Scroll to bottom function
  const scrollToBottom = (behavior: "smooth" | "instant" = "smooth") => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: behavior,
        });
      }
    }
  };

  // Function to add message with sequence and timestamp
  const addMessage = (
    type: "bot" | "user",
    content: string | React.ReactNode,
    rawContent?: string,
    customId?: string,
    isLoading?: boolean,
    isError?: boolean,
    originalQuery?: string
  ) => {
    setMessages((prev) => [
      ...prev,
      {
        id: customId || Date.now().toString(),
        type,
        content,
        rawContent,
        sequenceNumber: isLoading ? undefined : sequenceCounter,
        timestamp: new Date(),
        isError,
        originalQuery,
      },
    ]);

    if (!isLoading) {
      setSequenceCounter((prev) => prev + 1);
    }
  };

  const handleEntitySelect = (entity: Entity) => {
    setSelectedEntity(entity);

    if (entity === "lead") {
      addMessage("user", "I want to create a new lead");
      addMessage(
        "bot",
        <ConversationalLeadForm
          onComplete={(formData) => {
            toast({
              title: "Lead created successfully!",
            });
            setSelectedEntity(null);
          }}
        />
      );
    } else if (entity === "ai-query") {
      setTimeout(() => {
        if (aiInputRef.current) {
          aiInputRef.current.focus();
        }
      }, 100);
    } else {
      addMessage("user", `I want to create a new ${entity}`);
      addMessage(
        "bot",
        `I can help you create a new ${entity}. This functionality is coming soon.`
      );
      setTimeout(() => setSelectedEntity(null), 2000);
    }
  };

  // Handle retry for a failed question
  const handleRetry = (originalQuery: string) => {
    setAiInputValue(originalQuery);
    setSelectedEntity("ai-query");

    // Set the auto-submit flag to true to trigger submission
    setShouldAutoSubmit(true);
  };

  // Handle selecting a default question
  const handleDefaultQuestionSelect = (question: string) => {
    setAiInputValue(question);
    setSelectedEntity("ai-query");

    // Set the auto-submit flag to true to trigger submission
    setShouldAutoSubmit(true);
  };

  const handleAiSubmit = async () => {
    if (!aiInputValue.trim()) return;

    const userQuery = aiInputValue;
    const loadingMessageId = `loading-${Date.now()}`;

    addMessage("user", userQuery);
    setAiInputValue("");
    setIsLoading(true);

    try {
      // Add typing indicator with unique ID (no sequence number)
      addMessage(
        "bot",
        <div className="flex items-center gap-2">
          <div className="animate-bounce">●</div>
          <div className="animate-bounce delay-100">●</div>
          <div className="animate-bounce delay-200">●</div>
        </div>,
        undefined,
        loadingMessageId,
        true
      );

      // Call AI agent service
      const response = await aiAgentService.query(userQuery, aiSessionId);

      // Remove typing indicator
      setMessages((prev) => prev.filter((msg) => msg.id !== loadingMessageId));

      // Format and add AI response
      const formattedResponse = <FormattedMarkdown content={response.answer} />;

      addMessage("bot", formattedResponse, response.answer);

      // Store session ID for conversation continuity
      setAiSessionId(response.session_id);
    } catch (error: any) {
      // Remove typing indicator
      setMessages((prev) => prev.filter((msg) => msg.id !== loadingMessageId));

      // Add error message with retry functionality
      addMessage(
        "bot",
        <div className="flex items-start justify-between">
          <div className="flex-1">
            Sorry, I couldn't process your request. Please try again. Error:{" "}
            {error?.message || "Unknown error"}
          </div>
          {/* <Button 
            variant="outline" 
            size="icon" 
            className="ml-2 h-6 w-6 shrink-0"
            onClick={() => handleRetry(userQuery)}
            title="Retry this question"
          >
            <RotateCw className="h-3 w-3" />
          </Button> */}
        </div>,
        `Sorry, I couldn't process your request. Please try again. Error: ${
          error?.message || "Unknown error"
        }`,
        undefined,
        false,
        true,
        userQuery
      );

      toast({
        title: "Error connecting to AI agent",
        description: error?.message || "Unknown error",
        variant: "destructive",
      });

      console.error("AI Agent error:", error);
    } finally {
      setIsLoading(false);
      setExpandedTextArea(false);
    }
  };

  const toggleExpandedTextArea = () => {
    setExpandedTextArea(!expandedTextArea);
    setTimeout(() => {
      if (textAreaRef.current) {
        textAreaRef.current.focus();
      }
    }, 100);
  };

  const handleClearConversation = () => {
    setMessages([
      {
        id: "1",
        type: "bot",
        content:
          "Hello! I'm your CRM Assistant. I can help with various tasks like analyzing leads, providing insights, creating records, and answering questions about your business data. What would you like to do today?",
        sequenceNumber: 0,
        timestamp: new Date(),
      },
    ]);
    setSequenceCounter(1);
    setAiSessionId(undefined);
    setSelectedEntity(null);

    toast({
      title: "Conversation cleared",
      description: "Starting a new conversation",
    });
  };

  // Custom component for error message with retry button
  const ErrorMessage = ({
    message,
    originalQuery,
  }: {
    message: string;
    originalQuery: string;
  }) => (
    <div className="flex items-start justify-between">
      <div className="flex-1">{message}</div>
      <Button
        variant="outline"
        size="icon"
        className="ml-2 h-6 w-6 shrink-0"
        onClick={() => handleRetry(originalQuery)}
        title="Retry this question"
      >
        <RotateCw className="h-3 w-3" />
      </Button>
    </div>
  );

  return (
    <div className="flex flex-col h-svh lg:h-[80vh] bg-background overflow-auto z-50 border rounded-lg shadow-md">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-6 h-6" />
          <h1 className="text-lg font-semibold">Enhanced CRM Assistant</h1>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearConversation}
          title="Clear conversation"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 relative" ref={scrollAreaRef}>
        <ScrollArea className="h-full" onScroll={handleScroll}>
          <div className="p-4">
            <div className="space-y-4 max-w-3xl mx-auto">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.type === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div className="max-w-[85%] relative">
                    {/* Sequence number */}
                    {message.sequenceNumber !== undefined && (
                      <div
                        className={cn(
                          "absolute -top-2 w-5 h-5 rounded-full bg-background border text-xs flex items-center justify-center",
                          message.type === "user" ? "-right-2" : "-left-2"
                        )}
                      >
                        {message.sequenceNumber}
                      </div>
                    )}
                    <Card
                      className={cn(
                        "p-3",
                        message.type === "user"
                          ? "bg-primary text-primary-foreground"
                          : message.isError
                          ? "bg-red-50 border-red-200"
                          : "bg-muted"
                      )}
                    >
                      {message.isError && message.originalQuery ? (
                        <ErrorMessage
                          message={message.content as string}
                          originalQuery={message.originalQuery}
                        />
                      ) : (
                        message.content
                      )}
                      {/* Timestamp */}
                      {message.timestamp && (
                        <div
                          className={cn(
                            "text-xs opacity-70 mt-1",
                            message.type === "user" ? "text-right" : "text-left"
                          )}
                        >
                          {message.timestamp.toLocaleTimeString()}
                        </div>
                      )}
                    </Card>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </ScrollArea>

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <Button
            className="absolute bottom-4 right-4 rounded-full w-10 h-10 p-0 shadow-lg"
            onClick={() => scrollToBottom("smooth")}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        )}
      </div>

      {!selectedEntity && (
        <div className="p-4 border-t bg-background">
          {/* Default questions section */}
          <div className="max-w-3xl mx-auto mb-4">
            <h3 className="text-sm font-medium mb-2">Quick Questions:</h3>
            <div className="grid grid-cols-1 gap-2">
              {DEFAULT_QUESTIONS.map((question, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="text-left justify-start h-auto py-2 px-3"
                  onClick={() => handleDefaultQuestionSelect(question)}
                >
                  <Bot className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="text-xs line-clamp-1">{question}</span>
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 md:grid-cols-4 gap-2 max-w-3xl mx-auto">
            {/* <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto p-4"
              onClick={() => handleEntitySelect("lead")}
            >
              <UserPlus className="w-5 h-5" />
              <span className="text-xs">Create Lead</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto p-4"
              onClick={() => handleEntitySelect("contact")}
            >
              <UserPlus className="w-5 h-5" />
              <span className="text-xs">Create Contact</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto p-4"
              onClick={() => handleEntitySelect("account")}
            >
              <Building2 className="w-5 h-5" />
              <span className="text-xs">Create Account</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto p-4"
              onClick={() => handleEntitySelect("opportunity")}
            >
              <Target className="w-5 h-5" />
              <span className="text-xs">Create Opportunity</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto p-4"
              onClick={() => handleEntitySelect("task")}
            >
              <ClipboardList className="w-5 h-5" />
              <span className="text-xs">Create Task</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto p-4"
              onClick={() => handleEntitySelect("event")}
            >
              <Calendar className="w-5 h-5" />
              <span className="text-xs">Create Event</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto p-4"
              onClick={() => handleEntitySelect("product")}
            >
              <ShoppingCart className="w-5 h-5" />
              <span className="text-xs">Create Product</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto p-4"
              onClick={() => handleEntitySelect("report")}
            >
              <BarChart3 className="w-5 h-5" />
              <span className="text-xs">Run Report</span>
            </Button> */}
            <Button
              variant="default"
              className="flex flex-col items-center gap-2 h-auto p-4 col-span-full"
              onClick={() => handleEntitySelect("ai-query")}
            >
              <Bot className="w-5 h-5" />
              <span className="text-xs">Ask AI Assistant</span>
            </Button>
          </div>
        </div>
      )}

      {selectedEntity === "ai-query" && (
        <div className="p-4 border-t bg-background">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAiSubmit();
            }}
            className="space-y-2 max-w-3xl mx-auto"
          >
            {expandedTextArea ? (
              <textarea
                ref={textAreaRef}
                value={aiInputValue}
                onChange={(e) => setAiInputValue(e.target.value)}
                placeholder="Enter your detailed query here... (Analyze leads, generate reports, ask complex questions, etc.)"
                className="w-full h-32 p-2 border rounded resize-none"
                disabled={isLoading}
              />
            ) : (
              <div className="flex gap-2">
                <Input
                  ref={aiInputRef}
                  type="text"
                  value={aiInputValue}
                  onChange={(e) => setAiInputValue(e.target.value)}
                  placeholder="Ask about leads, contacts, tasks, data analysis, etc..."
                  className="flex-1"
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={toggleExpandedTextArea}
                  title="Expand for longer query"
                >
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="flex gap-2 justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedEntity(null)}
                className="w-1/4"
              >
                Back
              </Button>

              <Button
                type="submit"
                disabled={isLoading || !aiInputValue.trim()}
                className="w-3/4"
              >
                {isLoading ? "Processing..." : "Send Query"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {selectedEntity && selectedEntity !== "ai-query" && (
        <div className="p-4 border-t bg-background">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setSelectedEntity(null)}
          >
            Back to menu
          </Button>
        </div>
      )}
    </div>
  );
}

const ChatbotWidget = () => {
  const [openChat, setOpenChat] = useState(false);
  return (
    <>
      {openChat && (
        <div
          className={cn("fixed bottom-8 right-8 h-[80vh] w-[400px] shadow-md")}
        >
          <X className="absolute -top-1 -right-1 bg-background rounded-full hover:opacity-80" onClick={() => setOpenChat(false)}/>
          <EnhancedChatbot />
        </div>
      )}
      <div
        className="flex justify-center items-center h-16 w-16 md:h-20 md:w-20 rounded-full bg-primary text-white fixed bottom-4 right-4"
        onClick={() => setOpenChat((prev) => !prev)}
      >
        <BotIcon className="h-10 w-10 md:h-12 md:w-12" />
      </div>
    </>
  );
};

export default ChatbotWidget;
