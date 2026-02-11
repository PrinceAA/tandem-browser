import fs from 'fs';
import path from 'path';
import os from 'os';

export interface ContextSnapshot {
  url: string;
  domain: string;
  title: string;
  summary: string;
  timestamp: number;
  headings: string[];
  linksCount: number;
  notes: string[];
}

/**
 * ContextBridge — Makes everything Tandem reads available to external tools.
 * 
 * Stores context snapshots per URL in ~/.tandem/context/
 * Searchable, queryable via API. This is the bridge between Tandem and OpenClaw.
 */
export class ContextBridge {
  private contextDir: string;
  private indexPath: string;
  private index: Map<string, ContextSnapshot> = new Map();

  constructor() {
    this.contextDir = path.join(os.homedir(), '.tandem', 'context');
    this.indexPath = path.join(this.contextDir, '_index.json');

    if (!fs.existsSync(this.contextDir)) {
      fs.mkdirSync(this.contextDir, { recursive: true });
    }

    this.loadIndex();
  }

  /** Load the index from disk */
  private loadIndex(): void {
    try {
      if (fs.existsSync(this.indexPath)) {
        const raw: ContextSnapshot[] = JSON.parse(fs.readFileSync(this.indexPath, 'utf-8'));
        for (const snap of raw) {
          this.index.set(snap.url, snap);
        }
      }
    } catch {
      // Start fresh
    }
  }

  /** Save the index to disk */
  private saveIndex(): void {
    try {
      const entries = Array.from(this.index.values());
      fs.writeFileSync(this.indexPath, JSON.stringify(entries, null, 2));
    } catch {
      // Silent fail
    }
  }

  /** Extract domain from URL */
  private getDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return 'unknown';
    }
  }

  /**
   * Record a context snapshot for a page visit.
   * Called from main process after page load.
   */
  recordSnapshot(url: string, title: string, textContent: string, headings: string[], linksCount: number): ContextSnapshot {
    if (!url || url.startsWith('file://') || url.startsWith('about:')) {
      // Skip internal pages
      return { url, domain: 'internal', title, summary: '', timestamp: Date.now(), headings: [], linksCount: 0, notes: [] };
    }

    const domain = this.getDomain(url);
    const summary = textContent.replace(/\s+/g, ' ').trim().substring(0, 1000);

    const existing = this.index.get(url);
    const notes = existing?.notes || [];

    const snapshot: ContextSnapshot = {
      url,
      domain,
      title,
      summary,
      timestamp: Date.now(),
      headings: headings.slice(0, 30),
      linksCount,
      notes,
    };

    this.index.set(url, snapshot);

    // Keep index reasonable (max 5000 entries, remove oldest)
    if (this.index.size > 5000) {
      const entries = Array.from(this.index.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = entries.slice(0, entries.length - 5000);
      for (const [key] of toRemove) {
        this.index.delete(key);
      }
    }

    this.saveIndex();
    return snapshot;
  }

  /** Get recent pages (last N visited) */
  getRecent(limit: number = 50): ContextSnapshot[] {
    return Array.from(this.index.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /** Search through all context snapshots */
  search(query: string): ContextSnapshot[] {
    const q = query.toLowerCase();
    return Array.from(this.index.values())
      .filter(snap => {
        const searchable = `${snap.title} ${snap.domain} ${snap.summary} ${snap.headings.join(' ')} ${snap.notes.join(' ')}`.toLowerCase();
        return searchable.includes(q);
      })
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 100);
  }

  /** Get full context for a specific URL */
  getPage(url: string): ContextSnapshot | null {
    return this.index.get(url) || null;
  }

  /** Add a manual note to a page */
  addNote(url: string, note: string): ContextSnapshot | null {
    const snap = this.index.get(url);
    if (!snap) {
      // Create a minimal entry if page not yet visited
      const newSnap: ContextSnapshot = {
        url,
        domain: this.getDomain(url),
        title: '',
        summary: '',
        timestamp: Date.now(),
        headings: [],
        linksCount: 0,
        notes: [note],
      };
      this.index.set(url, newSnap);
      this.saveIndex();
      return newSnap;
    }

    snap.notes.push(note);
    this.saveIndex();
    return snap;
  }
}
