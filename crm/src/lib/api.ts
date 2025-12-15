import type { Opportunity, Stage } from "./types"

// Mock data for stages
const mockStages: Stage[] = [
  { id: "1", name: "Lead", order: 1 },
  { id: "2", name: "Qualified", order: 2 },
  { id: "3", name: "Proposal", order: 3 },
  { id: "4", name: "Negotiation", order: 4 },
  { id: "5", name: "Closed Won", order: 5 },
  { id: "6", name: "Closed Lost", order: 6 },
]

// Mock data for opportunities
const mockOpportunities: Opportunity[] = [
  {
    id: "1",
    name: "Enterprise Software Solution",
    company: "Acme Corp",
    contact: "John Smith",
    value: 75000,
    stageId: "1",
    createdAt: "2023-05-15T10:30:00Z",
    updatedAt: "2023-05-15T10:30:00Z",
    stageHistory: [],
  },
  {
    id: "2",
    name: "Cloud Migration Project",
    company: "TechGiant Inc",
    contact: "Sarah Johnson",
    value: 120000,
    stageId: "2",
    createdAt: "2023-05-10T14:45:00Z",
    updatedAt: "2023-05-12T09:15:00Z",
    stageHistory: [
      {
        fromStage: "1",
        toStage: "2",
        timestamp: "2023-05-12T09:15:00Z",
      },
    ],
  },
  {
    id: "3",
    name: "Security Audit Services",
    company: "SecureNet LLC",
    contact: "Michael Brown",
    value: 45000,
    stageId: "3",
    createdAt: "2023-05-05T11:20:00Z",
    updatedAt: "2023-05-14T16:30:00Z",
    stageHistory: [
      {
        fromStage: "1",
        toStage: "2",
        timestamp: "2023-05-08T13:45:00Z",
      },
      {
        fromStage: "2",
        toStage: "3",
        timestamp: "2023-05-14T16:30:00Z",
      },
    ],
  },
  {
    id: "4",
    name: "Data Analytics Platform",
    company: "DataViz Corp",
    contact: "Emily Chen",
    value: 95000,
    stageId: "2",
    createdAt: "2023-05-08T09:00:00Z",
    updatedAt: "2023-05-13T11:20:00Z",
    stageHistory: [
      {
        fromStage: "1",
        toStage: "2",
        timestamp: "2023-05-13T11:20:00Z",
      },
    ],
  },
  {
    id: "5",
    name: "IT Infrastructure Upgrade",
    company: "Global Industries",
    contact: "Robert Wilson",
    value: 150000,
    stageId: "4",
    createdAt: "2023-04-28T15:10:00Z",
    updatedAt: "2023-05-15T10:45:00Z",
    stageHistory: [
      {
        fromStage: "1",
        toStage: "2",
        timestamp: "2023-05-02T14:30:00Z",
      },
      {
        fromStage: "2",
        toStage: "3",
        timestamp: "2023-05-08T09:15:00Z",
      },
      {
        fromStage: "3",
        toStage: "4",
        timestamp: "2023-05-15T10:45:00Z",
      },
    ],
  },
  {
    id: "6",
    name: "CRM Implementation",
    company: "Retail Solutions Inc",
    contact: "Jennifer Lee",
    value: 85000,
    stageId: "5",
    createdAt: "2023-04-20T13:25:00Z",
    updatedAt: "2023-05-14T15:00:00Z",
    stageHistory: [
      {
        fromStage: "1",
        toStage: "2",
        timestamp: "2023-04-25T10:30:00Z",
      },
      {
        fromStage: "2",
        toStage: "3",
        timestamp: "2023-05-02T14:15:00Z",
      },
      {
        fromStage: "3",
        toStage: "4",
        timestamp: "2023-05-09T11:45:00Z",
      },
      {
        fromStage: "4",
        toStage: "5",
        timestamp: "2023-05-14T15:00:00Z",
      },
    ],
  },
  {
    id: "7",
    name: "Mobile App Development",
    company: "AppWorks LLC",
    contact: "David Kim",
    value: 65000,
    stageId: "6",
    createdAt: "2023-04-15T09:45:00Z",
    updatedAt: "2023-05-12T16:20:00Z",
    stageHistory: [
      {
        fromStage: "1",
        toStage: "2",
        timestamp: "2023-04-20T13:10:00Z",
      },
      {
        fromStage: "2",
        toStage: "3",
        timestamp: "2023-04-28T15:30:00Z",
      },
      {
        fromStage: "3",
        toStage: "4",
        timestamp: "2023-05-05T10:15:00Z",
      },
      {
        fromStage: "4",
        toStage: "6",
        timestamp: "2023-05-12T16:20:00Z",
      },
    ],
  },
  {
    id: "8",
    name: "Network Optimization",
    company: "ConnectTech Inc",
    contact: "Thomas Anderson",
    value: 55000,
    stageId: "3",
    createdAt: "2023-05-01T11:30:00Z",
    updatedAt: "2023-05-13T14:45:00Z",
    stageHistory: [
      {
        fromStage: "1",
        toStage: "2",
        timestamp: "2023-05-05T09:20:00Z",
      },
      {
        fromStage: "2",
        toStage: "3",
        timestamp: "2023-05-13T14:45:00Z",
      },
    ],
  },
]

// Simulate API calls with a delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Fetch all stages
export async function fetchStages(): Promise<Stage[]> {
  await delay(800)
  return [...mockStages]
}

// Fetch all opportunities
export async function fetchOpportunities(): Promise<Opportunity[]> {
  await delay(1000)
  return [...mockOpportunities]
}

// Update an opportunity's stage
export async function updateOpportunityStage({
  opportunityId,
  newStageId,
  previousStageId,
}: {
  opportunityId: string
  newStageId: string
  previousStageId: string
}): Promise<Opportunity> {
  await delay(500)

  // In a real application, this would be a PUT or PATCH request to your API
  const opportunity = mockOpportunities.find((opp) => opp.id === opportunityId)

  if (!opportunity) {
    throw new Error(`Opportunity with ID ${opportunityId} not found`)
  }

  // Update the opportunity
  opportunity.stageId = newStageId
  opportunity.updatedAt = new Date().toISOString()

  // Add to stage history
  opportunity.stageHistory.push({
    fromStage: previousStageId,
    toStage: newStageId,
    timestamp: new Date().toISOString(),
  })

  return opportunity
}
