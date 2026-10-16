export type RepeatRule = 'none' | 'daily' | 'weekly';
export type ReminderStatus = 'pending' | 'completed';
export type ReminderTypes =  | '' | 'Meeting' | 'Documentation' | 'Drink Water' | 'Take a Break' | 'Task' | 'Email' | 'Report Preparation' | 'Other';


export interface Reminder {
  id: string;
  type: ReminderTypes;
  title: string;
  notes: string;
  dueAt: string;
  repeat: RepeatRule;
  status: ReminderStatus;
  createdAt: string;
  lastFiredAt?: string;
}