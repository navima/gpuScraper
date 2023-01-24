import { useEffect, useState } from "react";
import { Database } from "sql.js";

interface Props {
    db: Database
}

export default function GpuTable({ db }: Props) {
    var [types, setTypes] = useState<string[]>([])

    useEffect(() => {
        var f = async () => {
            var types = db.exec("select distinct type from articles")[0]
            setTypes(types.values.map(row => row[0]?.toString() ?? ""));
        }
        f()
    }, [])

    return <>
        <table>
            <thead>
                <tr>
                    <td>Type</td>
                </tr>
            </thead>
            <tbody>
                {types.map(type => <tr><td>{type}</td></tr>)}
            </tbody>
        </table>
    </>
}