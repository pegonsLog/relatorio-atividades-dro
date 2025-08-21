import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class UserContextService {
  private readonly storageKey = 'dro.currentUser';

  getCurrentUserId(): string | null {
    try {
      if (typeof localStorage === 'undefined') return null;
      const v = localStorage.getItem(this.storageKey);
      return v && v.trim() ? v.trim() : null;
    } catch {
      return null;
    }
  }

  setCurrentUserId(userId: string): void {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(this.storageKey, (userId || '').trim());
    } catch {
      // ignore
    }
  }
}
