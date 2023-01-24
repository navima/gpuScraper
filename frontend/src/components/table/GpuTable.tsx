import { useEffect, useState } from "react";
import { Database } from "sql.js";
import dayjs from "dayjs";
import GpuTableRow from "./GpuTableRow";

interface Props {
    db: Database
}

export default function GpuTable({ db }: Props) {
    var [types, setTypes] = useState<string[]>([])
    var [prevDate, setPrevDate] = useState(dayjs().subtract(5, 'days'));

    useEffect(() => {
        var f = async () => {
            var types = db.exec("select distinct type from articles")?.[0]
            setTypes(types.values.map(row => row[0]?.toString() ?? ""));
            //setTypes(['rtx-3090', 'rtx-3060-ti', 'rx-6800'])
        }
        f()
    }, [])

    return <>
        <div>
            <p>Last price date is {prevDate.format('YYYY-MM-DD')}</p>
            <input type={'date'} value={prevDate.format('YYYY-MM-DD')} onChange={(e) => setPrevDate(dayjs(e.target.value))} />
            <table>
                <thead>
                    <tr>
                        <td>Type</td>
                        <td>Performance</td>
                        <td>MSRP</td>
                        <td>{prevDate.format('YYYY-MM-DD')}</td>
                        <td>Curr Price</td>
                        <td>δ</td>
                    </tr>
                </thead>
                <tbody>
                    {types.map(type => <GpuTableRow db={db} gpuType={type} prevDate={prevDate} key={type}/>)}
                </tbody>
            </table>
        </div>
    </>
}