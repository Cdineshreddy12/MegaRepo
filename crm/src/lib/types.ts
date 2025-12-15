export interface Stage {
  id: string
  name: string
  order: number
}

export interface StageHistoryEntry {
  fromStage: string
  toStage: string
  timestamp: string
}


export type SortOption = "name-asc" | "name-desc" | "value-asc" | "value-desc" | "newest" | "oldest"
