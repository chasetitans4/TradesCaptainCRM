import {
  getDocumentTemplates,
  getClientDocuments,
  uploadDocument,
  deleteDocument,
  getDocument,
} from '@/lib/admin/documents';

jest.mock('@/lib/supabase/server', () => {
  return {
    createAdminClient: jest.fn(() => {
      const m: any = (globalThis as any).__docMock || {};
      const buildChain = (table: string) => {
        const state: any = { filters: [], orderBy: [], limitN: null, selectFields: '*' };
        const resolveBase = () => {
          switch (table) {
            case 'documents': return m.documents || [];
            default: return [];
          }
        };
        const applyFilters = (rows: any[]) => {
          let data = Array.isArray(rows) ? [...rows] : [];
          for (const f of state.filters) {
            if (f.type === 'eq') data = data.filter((r: any) => r[f.col] === f.val);
          }
          for (const ord of state.orderBy) {
            data = data.sort((a: any, b: any) => {
              const k = ord.key;
              const asc = ord.asc;
              const av = a[k];
              const bv = b[k];
              const cmp = typeof av === 'string' && typeof bv === 'string'
                ? av.localeCompare(bv)
                : (av > bv ? 1 : av < bv ? -1 : 0);
              return asc ? cmp : -cmp;
            });
          }
          if (typeof state.limitN === 'number') data = data.slice(0, state.limitN);
          return data;
        };
        const chain: any = {
          select: (_fields?: string) => {
            state.selectFields = _fields || '*';
            return chain;
          },
          eq: (col: string, val: any) => {
            state.filters.push({ type: 'eq', col, val });
            return Object.assign({}, chain, { data: applyFilters(resolveBase()) });
          },
          order: (key: string, opts: any) => {
            state.orderBy.push({ key, asc: !!(opts && opts.ascending) });
            return Object.assign({}, chain, { data: applyFilters(resolveBase()) });
          },
          limit: (n: number) => {
            state.limitN = n;
            return Object.assign({}, chain, { data: applyFilters(resolveBase()) });
          },
          single: () => {
            const d = applyFilters(resolveBase());
            if (m.singleError) return { data: null, error: m.singleError };
            return { data: d[0] || null, error: null };
          },
          insert: (row: any) => ({
            select: () => ({
              single: () => ({ data: { id: 'new-doc', ...row }, error: null }),
            }),
          }),
          delete: () => ({
            eq: (_k: string, _v: any) => ({ error: null }),
          }),
          then: (resolve: any) => {
            const mcur: any = (globalThis as any).__docMock || {};
            let out;
            if (mcur.listError) {
              out = { data: null, error: new Error('list error') };
            } else if (mcur.nullData) {
              out = { data: null, error: null };
            } else {
              out = { data: applyFilters(resolveBase()), error: null };
            }
            return resolve(out);
          },
        };
        return chain;
      };
      return {
        from: (table: string) => buildChain(table),
      };
    }),
  };
});

describe('documents: templates', () => {
  beforeEach(() => {
    (globalThis as any).__docMock = {};
  });
  it('lists document templates and filters by category', async () => {
    (globalThis as any).__docMock = {
      documents: [
        { id: 't1', is_template: true, category: 'agreements', name: 'A', document_type: 'agreement' },
        { id: 't2', is_template: true, category: 'sales_tools', name: 'B', document_type: 'other' },
      ],
    };
    const all = await getDocumentTemplates();
    expect(all.length).toBe(2);
    const agreements = await getDocumentTemplates('agreements' as any);
    expect(agreements.length).toBe(1);
    expect(agreements[0].category).toBe('agreements');
  });
  it('throws when templates list query returns error', async () => {
    (globalThis as any).__docMock = { listError: true, documents: [] };
    await expect(getDocumentTemplates()).rejects.toThrow('Failed to get templates');
  });
  it('returns empty array when templates list data is null', async () => {
    (globalThis as any).__docMock = { nullData: true, documents: [] };
    const rows = await getDocumentTemplates();
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBe(0);
  });
});

describe('documents: client docs', () => {
  beforeEach(() => {
    (globalThis as any).__docMock = {};
  });
  it('lists client documents ordered by created_at and filtered by category', async () => {
    (globalThis as any).__docMock = {
      documents: [
        { id: 'd1', client_id: 'c1', is_template: false, category: 'agreements', created_at: '2025-01-02' },
        { id: 'd2', client_id: 'c1', is_template: false, category: 'sales_tools', created_at: '2025-01-03' },
      ],
    };
    const docs = await getClientDocuments('c1');
    expect(docs.length).toBe(2);
    expect(docs[0].id).toBe('d2');
    const filtered = await getClientDocuments('c1', 'agreements' as any);
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('d1');
  });
  it('throws when client docs list query returns error', async () => {
    (globalThis as any).__docMock = { listError: true, documents: [] };
    await expect(getClientDocuments('c1')).rejects.toThrow('Failed to get documents');
  });
  it('returns empty array when client docs list data is null', async () => {
    (globalThis as any).__docMock = { nullData: true, documents: [] };
    const list = await getClientDocuments('c1');
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBe(0);
  });
});

describe('documents: upload, delete, get', () => {
  beforeEach(() => {
    (globalThis as any).__docMock = {};
  });
  it('uploads a document and returns record', async () => {
    const doc = await uploadDocument('c1', 'a1', {
      name: 'Agreement',
      document_type: 'agreement' as any,
      category: 'agreements' as any,
      file_path: '/docs/agreement.docx',
    });
    expect(doc.id).toBe('new-doc');
    expect(doc.client_id).toBe('c1');
  });
  it('deletes a document by id', async () => {
    await expect(deleteDocument('doc-1')).resolves.toBeUndefined();
  });
  it('gets a document by id or null when not found', async () => {
    (globalThis as any).__docMock = {
      documents: [{ id: 'doc-1', name: 'Agreement' }],
    };
    const d1 = await getDocument('doc-1');
    expect(d1?.name).toBe('Agreement');
    const d2 = await getDocument('missing');
    expect(d2).toBeNull();
  });
  it('throws error when supabase returns non-PGRST116 error for getDocument', async () => {
    (globalThis as any).__docMock = {
      singleError: { code: 'PGRST123', message: 'db down' },
      documents: [],
    };
    await expect(getDocument('bad-id')).rejects.toThrow('Failed to get document: db down');
  });
});
