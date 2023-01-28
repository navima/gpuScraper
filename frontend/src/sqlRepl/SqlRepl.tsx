import { useState } from "react";
import { Database, QueryExecResult } from "sql.js";
import ResultsTable from "./ResultsTable";

interface Props {
    db: Database
}

/**
 * A simple SQL read-eval-print-loop
 * @param {{db: import("sql.js").Database}} props
 */
export default function SQLRepl({ db }: Props) {
    const [error, setError] = useState<any>();
    const [results, setResults] = useState<QueryExecResult[]>([]);

    function exec(sql: string) {
        try {
            // The sql is executed synchronously on the UI thread.
            // You may want to use a web worker here instead
            setResults(db.exec(sql)); // an array of objects is returned
            setError(null);
        } catch (err) {
            // exec throws an error when the SQL statement is invalid
            setError(err);
            setResults([]);
        }
    }

    return (
        <div className="App">
            <h1>Custom Query</h1>

            <textarea
                onChange={(e) => exec(e.target.value)}
                placeholder="Enter some SQL. No inspiration ? Try “select sqlite_version()”"
            ></textarea>

            <pre className="error">{(error || "").toString()}</pre>

            <pre>{
                // results contains one object per select statement in the query
                results.map(({ columns, values }, i) => (
                    <ResultsTable key={i} columns={columns} values={values} />
                ))
            }</pre>
        </div>
    );
}