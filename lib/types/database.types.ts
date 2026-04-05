export type LeadSource = 'cold_call' | 'referral' | 'inbound' | 'outbound'
export type ContactStatus = 'lead' | 'prospect' | 'customer' | 'churned'
export type DealStatus = 'open' | 'won' | 'lost'
export type ActivityType = 'call' | 'email' | 'meeting' | 'note' | 'task'
export type UserRole = 'admin' | 'rep' | 'viewer'

export interface User {
  id: string
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

export interface Company {
  id: string
  created_at: string
  updated_at: string
  name: string
  website: string | null
  industry: string | null
  employee_count: number | null
  annual_revenue: number | null
  address: string | null
  city: string | null
  state: string | null
  country: string | null
  owner_id: string | null
}

export interface CompanyWithOwner extends Company {
  owner: User | null
  _count?: {
    contacts: number
    deals: number
  }
}

export interface Contact {
  id: string
  created_at: string
  updated_at: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  company_id: string | null
  owner_id: string | null
  lead_source: LeadSource | null
  status: ContactStatus
  lead_score: number
  last_contacted_at: string | null
  notes: string | null
}

export interface ContactWithRelations extends Contact {
  company: Company | null
  owner: User | null
}

export interface Pipeline {
  id: string
  created_at: string
  name: string
  created_by: string | null
}

export interface PipelineStage {
  id: string
  created_at: string
  pipeline_id: string
  name: string
  order_index: number
  color: string
}

export interface Deal {
  id: string
  created_at: string
  updated_at: string
  title: string
  value: number
  currency: string
  stage_id: string | null
  contact_id: string | null
  company_id: string | null
  owner_id: string | null
  close_date: string | null
  probability: number
  stage_entered_at: string
  status: DealStatus
  lost_reason: string | null
}

export interface DealWithRelations extends Deal {
  stage: PipelineStage | null
  contact: Contact | null
  company: Company | null
  owner: User | null
  days_in_stage: number
}

export interface Activity {
  id: string
  created_at: string
  updated_at: string
  type: ActivityType
  contact_id: string | null
  deal_id: string | null
  owner_id: string | null
  due_at: string | null
  completed: boolean
  completed_at: string | null
  title: string
  body: string | null
  outcome: string | null
}

export interface ActivityWithRelations extends Activity {
  contact: Contact | null
  deal: Deal | null
  owner: User | null
}

export interface DashboardMetrics {
  totalOpenPipeline: number
  weightedPipeline: number
  dealsWonThisMonth: number
  dealsWonLastMonth: number
  revenueWonThisMonth: number
  avgDealSize: number
  closeRate: number
  overdueTasksCount: number
}

export interface PipelineStageWithDeals extends PipelineStage {
  deals: DealWithRelations[]
  totalValue: number
  weightedValue: number
}
