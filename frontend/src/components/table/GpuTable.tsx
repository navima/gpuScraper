import { useEffect, useState } from "react";
import { Database } from "sql.js";
import dayjs from "dayjs";
import GpuTableRow from "./GpuTableRow";

const except = function <T>(me: T[], other: Iterable<T>): T[] {
    const b1 = new Set(other)
    return [...new Set(me.filter((x: T) => !b1.has(x)))]
}

function sortTypes(types: string[]): string[] {
    types.sort()
    return types
}

interface Props {
    db: Database
}

export default function GpuTable({ db }: Props) {
    let [types, setTypes] = useState<string[]>([])
    let [prevDate, setPrevDate] = useState(dayjs().subtract(5, 'days'));
    let [ignored, setIgnored] = useState<string[]>([]);

    const toShow = except(types, ignored)

    useEffect(() => {
        const f = async () => {
            const types = db.exec("select distinct type from articles")?.[0]
            setTypes(sortTypes(types.values.map(row => row[0]?.toString() ?? "")));
            //setTypes(['rtx-3090', 'rtx-3060-ti', 'rx-6800'])
        }
        f()
    }, [])

    return <>
        <div>
            <p>Last price date is {prevDate.format('YYYY-MM-DD')}</p>
            <input type={'date'} value={prevDate.format('YYYY-MM-DD')} onChange={(e) => setPrevDate(dayjs(e.target.value))} />
            <div>
                Ignore list:
                {ignored.map(type => <div key={type} onClick={() => setIgnored(ignored.filter((elem) => elem != type))}>{type}</div>)}
            </div>
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
                    {toShow.map(type => <GpuTableRow db={db} gpuType={type} prevDate={prevDate} key={type} onClicked={() => setIgnored([...ignored, type])} />)}
                </tbody>
            </table>
        </div>
    </>
}