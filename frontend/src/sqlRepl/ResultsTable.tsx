import { SqlValue } from "sql.js";

interface Props {
    columns: string[],
    values: SqlValue[][]
}

/**
 * Renders a single value of the array returned by db.exec(...) as a table
 * @param {import("sql.js").QueryExecResult} props
 */
export default function ResultsTable({ columns, values }: Props) {
    return (
        <table>
            <thead>
                <tr>
                    {columns.map((columnName, i) => (
                        <td key={i}>{columnName}</td>
                    ))}
                </tr>
            </thead>

            <tbody>
                {values.map((row, i) => (
                    <tr key={i}>
                        {row.map((value, i) => (
                            <td key={i}>{value}</td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
