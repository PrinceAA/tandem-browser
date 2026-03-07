import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mockedPaths = vi.hoisted(() => ({ root: '' }));

vi.mock('../../utils/paths', () => ({
  tandemDir: (...segments: string[]) => path.join(mockedPaths.root, ...segments),
}));

import { BlocklistUpdater, BLOCKLIST_SOURCES } from '../blocklists/updater';
import { BLOCKLIST_REFRESH_INTERVALS_MS, type BlocklistSourceDefinition, type BlocklistSourceFreshness } from '../types';

interface StoredSourceFreshness {
  lastUpdated: string | null;
  lastAttempted: string | null;
  lastError: string | null;
  consecutiveFailures: number;
}

function createDbStub() {
  const blocklistEntries = new Map<string, { source: string; category: string }>();
  const freshnessBySource = new Map<string, StoredSourceFreshness>();
  const metadata = new Map<string, string>();

  const readFreshness = (sourceName: string): StoredSourceFreshness => freshnessBySource.get(sourceName) ?? {
    lastUpdated: null,
    lastAttempted: null,
    lastError: null,
    consecutiveFailures: 0,
  };

  const api = {
    syncBlocklistSource: vi.fn((sourceName: string, domains: string[], category: string) => {
      for (const [domain, entry] of blocklistEntries.entries()) {
        if (entry.source === sourceName) {
          blocklistEntries.delete(domain);
        }
      }

      for (const domain of domains) {
        blocklistEntries.set(domain, { source: sourceName, category });
      }

      return domains.length;
    }),
    setBlocklistMeta: vi.fn((key: string, value: string) => {
      metadata.set(key, value);
    }),
    getBlocklistSourceFreshness: vi.fn((source: BlocklistSourceDefinition, now = Date.now()): BlocklistSourceFreshness => {
      const stored = readFreshness(source.name);
      const refreshIntervalMs = BLOCKLIST_REFRESH_INTERVALS_MS[source.refreshTier];
      const lastUpdatedMs = stored.lastUpdated ? Date.parse(stored.lastUpdated) : Number.NaN;
      const hasValidLastUpdated = Number.isFinite(lastUpdatedMs);

      return {
        name: source.name,
        category: source.category,
        refreshTier: source.refreshTier,
        refreshIntervalMs,
        lastUpdated: stored.lastUpdated,
        lastAttempted: stored.lastAttempted,
        lastError: stored.lastError,
        consecutiveFailures: stored.consecutiveFailures,
        nextDueAt: hasValidLastUpdated ? new Date(lastUpdatedMs + refreshIntervalMs).toISOString() : null,
        due: !hasValidLastUpdated || now >= (lastUpdatedMs + refreshIntervalMs),
      };
    }),
    getBlocklistSourceFreshnessSnapshot: vi.fn((sources: BlocklistSourceDefinition[], now = Date.now()) =>
      sources.map((source) => api.getBlocklistSourceFreshness(source, now)),
    ),
    setBlocklistSourceFreshness: vi.fn((sourceName: string, freshness: Partial<StoredSourceFreshness>) => {
      const existing = readFreshness(sourceName);
      freshnessBySource.set(sourceName, {
        ...existing,
        ...freshness,
        consecutiveFailures: freshness.consecutiveFailures ?? existing.consecutiveFailures,
      });
    }),
    isDomainBlocked: (domain: string) => {
      const entry = blocklistEntries.get(domain);
      return entry
        ? { blocked: true, source: entry.source, category: entry.category }
        : { blocked: false };
    },
    getMetadataValue: (key: string) => metadata.get(key) ?? null,
  };

  return api;
}

let db = createDbStub();

describe('BlocklistUpdater tiered refresh', () => {
  afterEach(() => {
    if (mockedPaths.root && fs.existsSync(mockedPaths.root)) {
      fs.rmSync(mockedPaths.root, { recursive: true, force: true });
    }
    mockedPaths.root = '';
    db = createDbStub();
    vi.restoreAllMocks();
  });

  it('updates only due sources and records failures per source', async () => {
    mockedPaths.root = fs.mkdtempSync(path.join(os.tmpdir(), 'tandem-updater-'));

    const shield = { reload: vi.fn() };
    const updater = new BlocklistUpdater(db as never, shield as never);
    const now = Date.parse('2026-03-07T12:00:00.000Z');

    db.setBlocklistSourceFreshness('phishing', {
      lastUpdated: new Date(now - 60_000).toISOString(),
    });
    db.setBlocklistSourceFreshness('stevenblack', {
      lastUpdated: new Date(now - (8 * 24 * 60 * 60 * 1000)).toISOString(),
    });

    vi.spyOn(updater as any, 'download').mockImplementation(async (url: string) => {
      if (url === BLOCKLIST_SOURCES[0].url) {
        return 'http://malware.example/path\n';
      }
      if (url === BLOCKLIST_SOURCES[2].url) {
        throw new Error('weekly feed down');
      }
      throw new Error(`unexpected download: ${url}`);
    });

    const result = await updater.updateDueSources(now);

    expect(result.sources).toEqual([
      {
        name: 'urlhaus',
        refreshTier: 'hourly',
        domains: 1,
        added: 1,
        success: true,
        error: null,
      },
      {
        name: 'stevenblack',
        refreshTier: 'weekly',
        domains: 0,
        added: 0,
        success: false,
        error: 'weekly feed down',
      },
    ]);
    expect(result.errors).toEqual(['stevenblack: weekly feed down']);
    expect(shield.reload).toHaveBeenCalledTimes(1);

    expect(db.isDomainBlocked('malware.example')).toEqual({
      blocked: true,
      source: 'urlhaus',
      category: 'malware',
    });

    const hourlyStatus = db.getBlocklistSourceFreshness(BLOCKLIST_SOURCES[0], now);
    expect(hourlyStatus.lastUpdated).not.toBeNull();
    expect(hourlyStatus.lastError).toBeNull();
    expect(hourlyStatus.consecutiveFailures).toBe(0);

    const weeklyStatus = db.getBlocklistSourceFreshness(BLOCKLIST_SOURCES[2], now);
    expect(weeklyStatus.lastUpdated).toBe(new Date(now - (8 * 24 * 60 * 60 * 1000)).toISOString());
    expect(weeklyStatus.lastError).toBe('weekly feed down');
    expect(weeklyStatus.consecutiveFailures).toBe(1);

    const dailyStatus = db.getBlocklistSourceFreshness(BLOCKLIST_SOURCES[1], now);
    expect(dailyStatus.lastAttempted).toBeNull();
    expect(db.getMetadataValue('lastUpdated')).not.toBeNull();
  });

  it('reports source freshness based on the configured tier cadence', () => {
    mockedPaths.root = fs.mkdtempSync(path.join(os.tmpdir(), 'tandem-updater-'));

    const shield = { reload: vi.fn() };
    const updater = new BlocklistUpdater(db as never, shield as never);
    const now = Date.parse('2026-03-07T12:00:00.000Z');

    db.setBlocklistSourceFreshness('urlhaus', {
      lastUpdated: new Date(now - (30 * 60 * 1000)).toISOString(),
    });
    db.setBlocklistSourceFreshness('phishing', {
      lastUpdated: new Date(now - (2 * 24 * 60 * 60 * 1000)).toISOString(),
    });

    const statuses = updater.getSourceStatuses(now);
    expect(statuses.map((status) => ({
      name: status.name,
      refreshTier: status.refreshTier,
      due: status.due,
    }))).toEqual([
      { name: 'urlhaus', refreshTier: 'hourly', due: false },
      { name: 'phishing', refreshTier: 'daily', due: true },
      { name: 'stevenblack', refreshTier: 'weekly', due: true },
    ]);
  });
});
