import { useId, useRef, useState } from 'react';
import styles from './try_sql.module.css';

interface Result {
  columns: string[];
  rows: string[][];
}

export default function TrySQL({ sql }: { sql: string }) {
  const queryId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState(sql);
  const [status, setStatus] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [running, setRunning] = useState(false);

  async function run() {
    setRunning(true);
    setStatus('Loading HyperDB and running query...');
    setResult(null);
    try {
      const { runSQL } = await import('../lib/hyperdb');
      const output = await runSQL(query);
      setResult(output);
      setStatus(`${output.rows.length} row(s)`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className={styles.control}>
      <button className={styles.primary_button} type="button" onClick={() => dialog.current?.showModal()}>Try in playground</button>
      <dialog ref={dialog} className={styles.dialog} aria-label="SQL playground">
        <div className={styles.heading}>
          <h2>Try SQL</h2>
          <form method="dialog"><button type="submit">Close</button></form>
        </div>
        <label htmlFor={queryId}>SQL query</label>
        <textarea id={queryId} value={query} onChange={(event) => setQuery(event.target.value)} rows={6} spellCheck={false} />
        <button className={styles.primary_button} type="button" onClick={run} disabled={running || !query.trim()}>Run query</button>
        <p role="status">{status}</p>
        {result && <div className={styles.results}>
          <table>
            <thead><tr>{result.columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr></thead>
            <tbody>{result.rows.map((row, index) => <tr key={index}>{row.map((cell, column) => <td key={column}>{cell}</td>)}</tr>)}</tbody>
          </table>
        </div>}
      </dialog>
    </div>
  );
}
