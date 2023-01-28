import { useEffect, useState } from "react";
import { Database } from "sql.js";
import dayjs from "dayjs";
import Cookies from "js-cookie";
import GpuTableRow from "./GpuTableRow";
import { except } from "../../util/arrayUtils";

function sortTypes(types: string[]): string[] {
    types.sort()
    return types
}

interface Props {
    db: Database
}

export default function GpuTable({ db }: Props) {
    let [types, setTypes] = useState<string[]>([])
    let [prevDate, setPrevDate] = useState(dayjs().subtract(1, 'days'));
    let [ignored, setIgnored] = useState<string[]>([]);

    const toShow = except(types, ignored)

    useEffect(() => {
        const ignoredFromCookiesStr = Cookies.get('ignored')
        if (!ignoredFromCookiesStr)
            return;
        const ignoredFromCookies = JSON.parse(ignoredFromCookiesStr)
        setIgnored(ignoredFromCookies)
    }, [])

    useEffect(() => {
        const f = async () => {
            const types = db.exec("select type from models")?.[0]
            setTypes(sortTypes(types.values.map(row => row[0]?.toString() ?? "")));
        }
        f()
    }, [])

    useEffect(() => {
        // Save ignored to cookies
        Cookies.set('ignored', JSON.stringify(ignored))
    }, [ignored])

    return <>
        <div>
            <div style={{ display: "flex", flexDirection: "row", gap: "0.5em" }}>
                <label htmlFor="prevDate">Last price date</label>
                <input id="prevDate" type={'date'} value={prevDate.format('YYYY-MM-DD')} onChange={(e) => setPrevDate(dayjs(e.target.value))} />
                <a className="link" onClick={() => setPrevDate(dayjs().subtract(1, 'days'))}>1 day ago</a>
                <a className="link" onClick={() => setPrevDate(dayjs().subtract(2, 'days'))}>2 days ago</a>
                <a className="link" onClick={() => setPrevDate(dayjs().subtract(1, 'weeks'))}>1 week ago</a>
            </div>
            <details>
                <summary>
                    Ignore list
                </summary>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5em', flexDirection: 'column', height: '300px', marginTop: '0.5em' }}>
                    {ignored.map(type => <div key={type}>
                        <span className="clickable pill" onClick={() => setIgnored(ignored.filter((elem) => elem != type))}>
                            {type}
                        </span>
                    </div>)}
                </div>
            </details>
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