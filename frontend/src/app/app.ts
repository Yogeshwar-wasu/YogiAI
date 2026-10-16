import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Reminder, RepeatRule, ReminderTypes} from './reminder.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  reminders: Reminder[] = [];
  type : ReminderTypes = '';
  title = '';
  notes = '';
  repeat: RepeatRule = 'none';
  dueAt = this.defaultDateTime();
  filter: 'all' | 'pending' | 'completed' = 'all';
  error = '';

  private unsubscribeDue?: () => void;

  async ngOnInit(): Promise<void> {
    await this.refresh();

    this.unsubscribeDue = window.buddy.onReminderDue(() => {
      void this.refresh();
    });
  }

  ngOnDestroy(): void {
    this.unsubscribeDue?.();
  }

  get pendingCount(): number {
    return this.reminders.filter(
      reminder => reminder.status === 'pending'
    ).length;
  }

  get completedCount(): number {
    return this.reminders.filter(
      reminder => reminder.status === 'completed'
    ).length;
  }

  get filteredReminders(): Reminder[] {
    return [...this.reminders]
      .filter(reminder =>
        this.filter === 'all' ||
        reminder.status === this.filter
      )
      .sort((a, b) => {
        if (a.status !== b.status) {
          return a.status === 'pending' ? -1 : 1;
        }

        return new Date(a.dueAt).getTime() -
          new Date(b.dueAt).getTime();
      });
  }

  async refresh(): Promise<void> {
    this.reminders = await window.buddy.listReminders();
      console.log('Loaded reminders:', this.reminders);

  }

  async addReminder(form: NgForm): Promise<void> {
    this.error = '';

    if (form.invalid || !this.title.trim()) {
      this.error = 'Enter a task and select a date and time.';
      return;
    }

    const due = new Date(this.dueAt);

    if (Number.isNaN(due.getTime())) {
      this.error = 'Choose a valid date and time.';
      return;
    }

    if (due.getTime() < Date.now() - 60000) {
      this.error = 'Choose a future time.';
      return;
    }

    const reminder: Reminder = {
      id: crypto.randomUUID(),
      type : this.type,
      title: this.title.trim(),
      notes: this.notes.trim(),
      dueAt: due.toISOString(),
      repeat: this.repeat,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    this.reminders =
      await window.buddy.saveReminder(reminder);
    this.type = '';  
    this.title = '';
    this.notes = '';
    this.repeat = 'none';
    this.dueAt = this.defaultDateTime();

    form.resetForm({
      type : '',
      repeat: 'none',
      dueAt: this.dueAt
    });
  }

  async complete(id: string): Promise<void> {
    this.reminders =
      await window.buddy.completeReminder(id);
  }

  async remove(id: string): Promise<void> {
    this.reminders =
      await window.buddy.deleteReminder(id);
  }

  async snooze(id: string): Promise<void> {
    this.reminders =
      await window.buddy.snoozeReminder(id, 5);
  }

  previewBuddy(): void {
    void window.buddy.openCharacterDemo();
  }

  hideBuddy(): void {
    void window.buddy.hideCharacter();
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  private defaultDateTime(): string {
    const date = new Date(Date.now() + 10 * 60000);
    date.setSeconds(0, 0);

    const localDate = new Date(
      date.getTime() - date.getTimezoneOffset() * 60000
    );

    return localDate.toISOString().slice(0, 16);
  }
}