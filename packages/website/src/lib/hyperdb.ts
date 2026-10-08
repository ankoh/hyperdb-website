import workerUrl from 'hyperdb-worker-url';
import engineUrl from 'hyperdb-engine-url';
import wasmUrl from 'hyperdb-wasm-url';

export async function runSQL(sql: string): Promise<{ columns: string[]; rows: string[][] }> {
  const { HyperDB } = await import('hyperdb-wasm');
  const database = await HyperDB.create({
    workerUrl: new URL(workerUrl, location.href),
    engineUrl: new URL(engineUrl, location.href),
    wasmUrl: new URL(wasmUrl, location.href),
  });
  try {
    const connection = await database.connect();
    try {
      const table = await connection.query(sql);
      const columns = table.schema.fields.map((field) => field.name);
      const rows = Array.from({ length: table.numRows }, (_, index) =>
        columns.map((column) => String(table.getChild(column)?.get(index) ?? 'NULL')),
      );
      return { columns, rows };
    } finally {
      await connection.close();
    }
  } finally {
    await database.terminate();
  }
}
