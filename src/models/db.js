// src/models/db.js — Pure-JS JSON database using lowdb (no build tools needed)
const { LowSync } = require('lowdb');
const { JSONFileSync } = require('lowdb/node');
const path = require('path');
const fs   = require('fs');
require('dotenv').config();

const dbPath = process.env.DB_PATH || './data/recruitai.json';
const dbDir  = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

// ── Default schema ─────────────────────────────────────────────────────────
const adapter  = new JSONFileSync(dbPath);
const low      = new LowSync(adapter, {
  users:         [],
  jobs:          [],
  candidates:    [],
  interviews:    [],
  emails:        [],
  notifications: [],
  talent_pool:   [],
  scorecards:    [],
  applications:  [],   // public job board applications
});

low.read();

// ── Tiny SQL-like query helpers ─────────────────────────────────────────────
// These mimic the better-sqlite3 .prepare().get/all/run interface so the
// rest of the codebase needs minimal changes.

const db = {
  get data() { return low.data; },
  write() { low.write(); },
  prepare(sql) { return new Statement(sql, low); },
  exec() {},
  pragma() {},
};

// ── Statement class ─────────────────────────────────────────────────────────
class Statement {
  constructor(sql, low) {
    this.sql = sql.trim();
    this.low = low;
  }

  _parse(params) {
    const sql   = this.sql;
    const data  = this.low.data;
    const upper = sql.toUpperCase();

    // ── SELECT ──────────────────────────────────────────────────────────
    if (upper.startsWith('SELECT')) {
      const table = this._table(sql);
      if (!data[table]) return { rows: [], type: 'select' };

      let rows = [...data[table]];
      rows = this._applyWhere(rows, sql, params);

      // ORDER BY
      const orderMatch = sql.match(/ORDER BY\s+(\w+)\s*(ASC|DESC)?/i);
      if (orderMatch) {
        const col = orderMatch[1];
        const dir = (orderMatch[2] || 'ASC').toUpperCase();
        rows.sort((a, b) => {
          if (a[col] == null) return 1;
          if (b[col] == null) return -1;
          return dir === 'ASC'
            ? String(a[col]).localeCompare(String(b[col]), undefined, { numeric: true })
            : String(b[col]).localeCompare(String(a[col]), undefined, { numeric: true });
        });
      }

      // LIMIT / OFFSET — find param indices after WHERE params
      const whereParamCount = (sql.match(/WHERE/i)
        ? (sql.slice(0, sql.search(/LIMIT/i) > -1 ? sql.search(/LIMIT/i) : sql.length).match(/\?/g) || []).length
        : 0);

      const limitMatch  = sql.match(/LIMIT\s+(\?|-?\d+)/i);
      const offsetMatch = sql.match(/OFFSET\s+(\?|-?\d+)/i);
      let pOff = whereParamCount;
      let limit  = limitMatch  ? (limitMatch[1]  === '?' ? params[pOff++]   : parseInt(limitMatch[1]))  : null;
      let offset = offsetMatch ? (offsetMatch[1] === '?' ? params[pOff]     : parseInt(offsetMatch[1])) : 0;

      if (offset) rows = rows.slice(offset);
      if (limit != null) rows = rows.slice(0, limit);

      // COUNT(*)
      if (/SELECT\s+COUNT\s*\(\s*\*\s*\)/i.test(sql)) {
        return { rows: [{ cnt: rows.length }], type: 'select' };
      }

      // AVG(col)
      const avgMatch = sql.match(/SELECT\s+AVG\s*\(\s*(\w+)\s*\)/i);
      if (avgMatch) {
        const col  = avgMatch[1];
        const vals = rows.map(r => r[col]).filter(v => v != null);
        return { rows: [{ avg: vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : null }], type: 'select' };
      }

      // strftime monthly grouping
      if (/strftime/i.test(sql)) {
        const groups = {};
        rows.forEach(r => {
          const month = (r.applied || r.created_at || '').slice(0, 7);
          if (!groups[month]) groups[month] = [];
          groups[month].push(r);
        });
        const result = Object.entries(groups)
          .sort(([a],[b]) => a.localeCompare(b))
          .map(([month, rs]) => ({
            month,
            applied:     rs.length,
            shortlisted: rs.filter(r => ['Shortlisted','Selected'].includes(r.status)).length,
            hired:       rs.filter(r => r.status === 'Selected').length,
            avg_score:   rs.length ? rs.reduce((s,r)=>s+(r.score||0),0)/rs.length : 0,
          }));
        return { rows: result, type: 'select' };
      }

      // GROUP BY
      const groupMatch = sql.match(/GROUP BY\s+([\w,\s]+?)(?:\s+ORDER|\s+LIMIT|$)/i);
      if (groupMatch) {
        const groupCols = groupMatch[1].split(',').map(s => s.trim());
        const grouped   = {};
        rows.forEach(r => {
          const key = groupCols.map(c => r[c] || '').join('|');
          if (!grouped[key]) grouped[key] = { _rows: [], ...Object.fromEntries(groupCols.map(c => [c, r[c]])) };
          grouped[key]._rows.push(r);
        });
        const result = Object.values(grouped).map(g => {
          const out = { ...g }; delete out._rows;
          const cntMatch = sql.match(/COUNT\s*\(\s*\*\s*\)\s+as\s+(\w+)/i);
          out[cntMatch ? cntMatch[1] : 'count'] = g._rows.length;
          const sumMatch = sql.match(/SUM\s*\(\s*applicants\s*\)/i);
          if (sumMatch) out.applicants = g._rows.reduce((s,r)=>s+(r.applicants||0),0);
          return out;
        });
        return { rows: result, type: 'select' };
      }

      return { rows, type: 'select' };
    }

    // ── INSERT ──────────────────────────────────────────────────────────
    if (upper.startsWith('INSERT')) {
      const table    = this._table(sql);
      const colMatch = sql.match(/\(([^)]+)\)\s+VALUES/i);
      if (!colMatch) return { type: 'run' };
      const cols = colMatch[1].split(',').map(s => s.trim());
      const obj  = {};
      cols.forEach((col, i) => { obj[col] = params[i] !== undefined ? params[i] : null; });
      if (!obj.created_at) obj.created_at = new Date().toISOString().replace('T',' ').slice(0,19);
      if (cols.includes('applied') && !obj.applied) obj.applied = new Date().toISOString().slice(0,10);
      if (cols.includes('posted')  && !obj.posted)  obj.posted  = new Date().toISOString().slice(0,10);
      if (!data[table]) data[table] = [];
      data[table].push(obj);
      low.write();
      return { type: 'run' };
    }

    // ── UPDATE ──────────────────────────────────────────────────────────
    if (upper.startsWith('UPDATE')) {
      const table    = this._table(sql);
      const setMatch = sql.match(/SET\s+(.+?)\s+WHERE/is);
      if (!setMatch) return { type: 'run' };
      const setPairs = setMatch[1].split(',').map(s => s.trim());
      const numSet   = setPairs.length;
      const setVals  = params.slice(0, numSet);
      const whereVals= params.slice(numSet);
      const matched  = new Set(this._applyWhere([...data[table]||[]], sql.replace(/SET.+?(?=WHERE)/is, ''), whereVals).map(r=>r.id));
      data[table] = (data[table]||[]).map(r => {
        if (!matched.has(r.id)) return r;
        const u = { ...r };
        setPairs.forEach((pair, i) => {
          const col = pair.split(/\s*=\s*/)[0].trim();
          if (/MAX\(0,\s*applicants\s*-\s*1\)/i.test(pair))       u.applicants = Math.max(0,(r.applicants||0)-1);
          else if (/applicants\s*=\s*applicants\s*\+\s*1/i.test(pair)) u.applicants = (r.applicants||0)+1;
          else u[col] = setVals[i];
        });
        return u;
      });
      low.write();
      return { type: 'run' };
    }

    // ── DELETE ──────────────────────────────────────────────────────────
    if (upper.startsWith('DELETE')) {
      const table   = this._table(sql);
      const matched = new Set(this._applyWhere([...data[table]||[]], sql, params).map(r=>r.id));
      data[table]   = (data[table]||[]).filter(r => !matched.has(r.id));
      low.write();
      return { type: 'run' };
    }

    return { type: 'unknown' };
  }

  _table(sql) {
    const m = sql.match(/(?:FROM|INTO|UPDATE|DELETE FROM)\s+(\w+)/i);
    return m ? m[1] : '';
  }

  _applyWhere(rows, sql, params) {
    const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+GROUP BY|\s+ORDER BY|\s+LIMIT|$)/is);
    if (!whereMatch) return rows;
    const parts = whereMatch[1].trim().split(/\s+AND\s+/i);
    let pIndex = 0;
    return rows.filter(row => parts.every(part => {
      part = part.trim();
      if (/^1\s*=\s*1$/.test(part)) return true;
      if (/julianday|date\('now'/i.test(part)) {
        const m = part.match(/-(\d+)\s*months?/i);
        if (m) {
          const cutoff = new Date();
          cutoff.setMonth(cutoff.getMonth() - parseInt(m[1]));
          return new Date(row.applied || '1970-01-01') >= cutoff;
        }
        return true;
      }
      const eqMatch = part.match(/^(\w+)\s*=\s*\?$/i);
      if (eqMatch) {
        const val = params[pIndex++];
        if (val === null || val === undefined) return true;
        return String(row[eqMatch[1]] ?? '') === String(val);
      }
      const likeMatch = part.match(/^(\w+)\s+LIKE\s+\?$/i);
      if (likeMatch) {
        const pattern = String(params[pIndex++] || '').replace(/%/g,'');
        return String(row[likeMatch[1]] ?? '').toLowerCase().includes(pattern.toLowerCase());
      }
      return true;
    }));
  }

  get(...params)  { return this._parse(params).rows[0] || null; }
  all(...params)  { return this._parse(params).rows; }
  run(...params)  { return this._parse(params); }
}

module.exports = db;
