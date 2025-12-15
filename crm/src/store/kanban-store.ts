import { Lead } from "@/services/api/leadService"
import { Opportunity } from "@/services/api/opportunityService"
import { create } from "zustand"

interface KanbanStoreState<T> {
  activeRecord: T | null
  setActiveRecord: (record: T | null) => void
}

// Factory function to create a generic store
export const createKanbanStore  = <T>() =>
  create<KanbanStoreState<T>>((set) => ({
    activeRecord: null,
    setActiveRecord: (record) => set({ activeRecord: record }),
  }))


  export const useOpportunityKanbanStore = createKanbanStore<Opportunity>()
  export const useLeadKanbanStore = createKanbanStore<Lead>()
