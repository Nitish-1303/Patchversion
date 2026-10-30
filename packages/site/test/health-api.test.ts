/**
 * @jest-environment node
 */
import { GET } from '../src/app/api/health/route';
import { _resetInstancesForTest, setPostgresStore, setActiveStore } from '../src/app/api/backend';
import { PostgresStore, PatchversionDatabase } from '@patchversion/engine';
import { Pool } from 'pg';

describe('GET /api/health Endpoint', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    _resetInstancesForTest();
  });

  afterEach(() => {
    _resetInstancesForTest();
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  test('1. Successful SQL ping returns HTTP 200 and healthy status when ping === 1', async () => {
    const mockQuery = jest.fn().mockResolvedValue({
      command: 'SELECT',
      rowCount: 1,
      rows: [{ ping: 1 }],
    });
    const mockPool = {
      query: mockQuery,
      end: jest.fn(),
    } as unknown as Pool;

    const store = new PostgresStore({ pool: mockPool });
    setPostgresStore(store);

    const res = await GET();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.status).toBe('healthy');
    expect(data.version).toBe('0.1.0');
    expect(data.service).toBe('trypatchbay');
    expect(typeof data.timestamp).toBe('string');
    expect(new Date(data.timestamp).toISOString()).toBe(data.timestamp);

    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery).toHaveBeenCalledWith('SELECT 1 AS ping', []);
  });

  test('2. Database connection failure returns HTTP 503 and logs sanitized error category', async () => {
    const mockQuery = jest.fn().mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:5432'));
    const mockPool = {
      query: mockQuery,
      end: jest.fn(),
    } as unknown as Pool;

    const store = new PostgresStore({ pool: mockPool });
    setPostgresStore(store);

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await GET();
    expect(res.status).toBe(503);

    const data = await res.json();
    expect(data.status).toBe('unhealthy');
    expect(data.error).toBe('Database service unavailable');
    expect(data.service).toBe('trypatchbay');
    expect(typeof data.timestamp).toBe('string');

    // Verify stable sanitized error category is logged without raw error text
    expect(consoleSpy).toHaveBeenCalledWith('[health] Database check failed: category=database_unavailable');
    const loggedMessage = consoleSpy.mock.calls[0]?.[0];
    expect(loggedMessage).not.toContain('ECONNREFUSED');
    expect(loggedMessage).not.toContain('127.0.0.1');
  });

  test('3. Sanitized error response and logs never expose credentials, connection strings, or hostnames', async () => {
    const sensitiveErrorMsg =
      'password authentication failed for user "neondb_owner" at postgres://neondb_owner:super_secret_password_xyz@ep-soft-boat-25874887-pooler.us-east-1.aws.neon.tech/neondb';
    const mockQuery = jest.fn().mockRejectedValue(new Error(sensitiveErrorMsg));
    const mockPool = {
      query: mockQuery,
      end: jest.fn(),
    } as unknown as Pool;

    const store = new PostgresStore({ pool: mockPool });
    setPostgresStore(store);

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await GET();
    expect(res.status).toBe(503);

    const rawResponseText = await res.text();
    const data = JSON.parse(rawResponseText);

    // Verify sanitized error response to client
    expect(data.error).toBe('Database service unavailable');
    expect(rawResponseText).not.toContain('neondb_owner');
    expect(rawResponseText).not.toContain('super_secret_password_xyz');
    expect(rawResponseText).not.toContain('ep-soft-boat-25874887');
    expect(rawResponseText).not.toContain('neon.tech');
    expect(rawResponseText).not.toContain('postgres://');
    expect(rawResponseText).not.toContain('password authentication failed');

    // Verify server-side log is strictly sanitized
    expect(consoleSpy).toHaveBeenCalledWith('[health] Database check failed: category=database_unavailable');
    const loggedOutput = consoleSpy.mock.calls.map((call) => call.join(' ')).join(' ');
    expect(loggedOutput).not.toContain('neondb_owner');
    expect(loggedOutput).not.toContain('super_secret_password_xyz');
    expect(loggedOutput).not.toContain('ep-soft-boat-25874887');
    expect(loggedOutput).not.toContain('neon.tech');
    expect(loggedOutput).not.toContain('postgres://');
  });

  test('4. Validates exact ping value: rejects empty, non-1, or unexpected rows', async () => {
    const testCases: Array<{ rows: unknown[]; desc: string }> = [
      { rows: [], desc: 'empty rows array' },
      { rows: [{ ping: 2 }], desc: 'unexpected ping value 2' },
      { rows: [{ ping: 0 }], desc: 'unexpected ping value 0' },
      { rows: [{ ping: null }], desc: 'null ping value' },
      { rows: [{ wrong_column: 1 }], desc: 'missing ping column' },
      { rows: [{ ping: 1 }, { ping: 1 }], desc: 'multiple rows' },
    ];

    for (const { rows, desc } of testCases) {
      _resetInstancesForTest();
      const mockQuery = jest.fn().mockResolvedValue({
        command: 'SELECT',
        rowCount: rows.length,
        rows,
      });
      const mockPool = {
        query: mockQuery,
        end: jest.fn(),
      } as unknown as Pool;

      const store = new PostgresStore({ pool: mockPool });
      setPostgresStore(store);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const res = await GET();
      expect(res.status).toBe(503);
      const data = await res.json();
      expect(data.status).toBe('unhealthy');
      expect(data.error).toBe('Database service unavailable');
      expect(consoleSpy).toHaveBeenCalledWith('[health] Database check failed: category=invalid_ping_result');
    }
  });

  test('5. No schema or data modification is performed during health check', async () => {
    const executedQueries: string[] = [];
    const mockQuery = jest.fn().mockImplementation((sql: string) => {
      executedQueries.push(sql);
      return Promise.resolve({
        command: 'SELECT',
        rowCount: 1,
        rows: [{ ping: 1 }],
      });
    });
    const mockPool = {
      query: mockQuery,
      end: jest.fn(),
    } as unknown as Pool;

    const store = new PostgresStore({ pool: mockPool });
    setPostgresStore(store);

    const res = await GET();
    expect(res.status).toBe(200);

    // Exactly 1 query executed
    expect(executedQueries.length).toBe(1);
    expect(executedQueries[0]).toBe('SELECT 1 AS ping');

    // Verify absolutely no mutating or destructive SQL was run
    for (const sql of executedQueries) {
      expect(sql).not.toMatch(/INSERT/i);
      expect(sql).not.toMatch(/UPDATE/i);
      expect(sql).not.toMatch(/DELETE/i);
      expect(sql).not.toMatch(/DROP/i);
      expect(sql).not.toMatch(/CREATE/i);
      expect(sql).not.toMatch(/ALTER/i);
      expect(sql).not.toMatch(/TRUNCATE/i);
    }
  });

  test('6. Refuses fallback to ephemeral storage in production when DATABASE_URL is missing', async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    delete process.env.DATABASE_URL;
    delete process.env.POSTGRES_URL;

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await GET();
    expect(res.status).toBe(503);

    const data = await res.json();
    expect(data.status).toBe('unhealthy');
    expect(data.error).toBe('Database service unavailable');
    expect(consoleSpy).toHaveBeenCalledWith('[health] Database check failed: category=missing_production_config');
  });

  test('7. Refuses fallback to ephemeral storage in production even if ephemeral store was initialized', async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    process.env.DATABASE_URL = 'postgres://dummy:dummy@localhost:5432/dummy';

    const ephemeralStore = new PatchversionDatabase('/tmp/test-ephemeral-store');
    setActiveStore(ephemeralStore);

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const res = await GET();
    expect(res.status).toBe(503);

    const data = await res.json();
    expect(data.status).toBe('unhealthy');
    expect(data.error).toBe('Database service unavailable');
    expect(consoleSpy).toHaveBeenCalledWith('[health] Database check failed: category=unsupported_storage');
  });
});
