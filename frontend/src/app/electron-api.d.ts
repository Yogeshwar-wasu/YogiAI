import { Reminder } from './reminder.model';

export interface BuddyApi {
  listReminders(): Promise<Reminder[]>;
  saveReminder(reminder: Reminder): Promise<Reminder[]>;
  deleteReminder(id: string): Promise<Reminder[]>;
  completeReminder(id: string): Promise<Reminder[]>;
  snoozeReminder(id: string, minutes: number): Promise<Reminder[]>;

  openCharacterDemo(): Promise<void>;
  hideCharacter(): Promise<void>;

  onReminderDue(
    callback: (reminder: Reminder) => void
  ): () => void;
}

declare global {
  interface Window {
    buddy: BuddyApi;
  }
}