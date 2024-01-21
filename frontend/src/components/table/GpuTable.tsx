import { useEffect, useState } from "react";
import { Database } from "sql.js";
import dayjs from "dayjs";
import Cookies from "js-cookie";
import GpuTableRow from "./GpuTableRow";
import Record from "./Record";
import "./styles.css";
import { time } from "../../util/performanceUtils";
import Chart from "../Chart";

function compare(a: string, b: string) {
    if (a < b)
        return -1
    if (a > b)
        return 1
    return 0
}

function sortRecords(records: Record[]): Record[] {
    records.sort((a, b) => compare(a.name, b.name))
    return records
}

export function parseIntOrUndefined(s: string | undefined | null): number | undefined {
    const value = Number.parseInt(s ?? "NaN");
    if (Number.isNaN(value)) return undefined;
    return value;
}

//class TableConfiguration {
//    ignoredTypes: string[] = [];
//}

interface Props {
    db: Database
}

export default function GpuTable({ db }: Props) {
    const [prevDate, setPrevDate] = useState(dayjs().subtract(1, 'days'));
    const [records, setRecords] = useState<Record[]>([]);
    const [refreshValues, setRefreshValues] = useState(0)

    const toIgnore = records.filter(r => r.ignored)
    const toShow = records.filter(r => !r.ignored)

    console.log("table render called");

    // Update ignore list from cookies
    useEffect(() => {
        const ignoredFromCookiesStr = Cookies.get('ignored')
        if (!ignoredFromCookiesStr!)
            return;
        const ignoredFromCookies: string[] = JSON.parse(ignoredFromCookiesStr)
        ignoredFromCookies.forEach(type => {
            const record = records.find(r => r.type === type)
            if (record!) {
                record.ignored = true
            }
        });
    }, [records])

    // Query records
    useEffect(() => {
        const f = time("mass query finished in {0}", async () => {
            const pseudoRecords = db.exec(`
                SELECT m.type,
                    m.name,
                    m.MSRP,
                    b.value as Performance
                FROM models m
                    LEFT JOIN (
                        SELECT *
                        FROM benchmarks
                        WHERE type = '1440p;high;rtx'
                    ) b ON modelType = m.type
            `)?.[0]
            setRecords(sortRecords(pseudoRecords.values.map(pr => {
                const [type, name, msrp, performance] = pr;
                const record = new Record();
                record.type = type?.toString() ?? "";
                record.name = name?.toString() ?? "";
                record.msrp = parseIntOrUndefined(msrp?.toString())
                record.performance = parseIntOrUndefined(performance?.toString())
                return record;
            })))
        })
        f()
    }, [db])

    // Query additional data for records
    useEffect(() => {
        const f = time("per-record queries finished in {0}", async () => {
            console.log(`started per-record queries for ${records.filter(r => !r.ignored).length} types`)
            records.filter(r => !r.ignored).forEach(record => {
                const startTime = performance.now();
                record.prevDate = prevDate;
                const currPriceQueryRes = db.exec(
                    `
                    SELECT price
                    FROM articles
                    WHERE type = $type
                    ORDER BY insertTime DESC
                    LIMIT 1
                    `,
                    { "$type": record.type })?.[0]
                record.currentPrice = parseIntOrUndefined(currPriceQueryRes?.values?.[0]?.[0]?.toString());

                const prevPriceQueryRes = db.exec(
                    `
                    SELECT price
                    FROM articles
                    WHERE type = $type
                        AND insertTime < $prevDate
                    ORDER BY insertTime DESC
                    LIMIT 1
                    `,
                    {
                        "$type": record.type,
                        "$prevDate": prevDate.add(1, 'day').format("YYYY-MM-DD")
                    })?.[0]
                record.previousPrice = parseIntOrUndefined(prevPriceQueryRes?.values?.[0]?.[0]?.toString());

                const cheapestPastMonth = db.exec(
                    `
                    SELECT min(price)
                    FROM articles
                    WHERE price IS NOT NULL
                        AND price <> 0
                        AND type = $type
                        AND insertTime > $prevDate
                    ORDER BY insertTime DESC
                    `,
                    {
                        "$type": record.type,
                        "$prevDate": dayjs().subtract(1, 'month').format("YYYY-MM-DD")
                    })?.[0]
                record.cheapestPastMonth = parseIntOrUndefined(cheapestPastMonth?.values?.[0]?.[0]?.toString());

                const cheapestEver = db.exec(
                    `
                    SELECT min(price)
                    FROM articles
                    WHERE price IS NOT NULL
                        AND price <> 0
                        AND type = $type
                    ORDER BY insertTime DESC
                    `,
                    {
                        "$type": record.type,
                        "$prevDate": dayjs().subtract(1, 'month').format("YYYY-MM-DD")
                    })?.[0]
                record.cheapestEver = parseIntOrUndefined(cheapestEver?.values?.[0]?.[0]?.toString());

                console.log(`${record.type} query finished in ${performance.now() - startTime}`)
            });
            setRefreshValues(refreshValues + 1);
        })
        f()
        // eslint-disable-next-line
    }, [db, records, prevDate])

    /**
     * Ignore a record. (Also updates cookies)
     */
    function ignore(record: Record) {
        record.ignored = true;
        const ignoredTypes = records
            .filter(r => r.ignored)
            .map(r => r.type)
        Cookies.set('ignored', JSON.stringify(ignoredTypes))
        setRefreshValues(refreshValues + 1);
    }

    /**
    * Un-Ignore a record. (Also updates cookies)
    */
    function unignore(record: Record) {
        record.ignored = false;
        const ignoredTypes = records
            .filter(r => r.ignored)
            .map(r => r.type)
        Cookies.set('ignored', JSON.stringify(ignoredTypes))
        setRefreshValues(refreshValues + 1);
    }

    return <>
        <div>
            <div style={{ display: "flex", flexDirection: "row", gap: "0.5em" }}>
                <label htmlFor="prevDate">Last price date</label>
                <input id="prevDate" type={'date'} value={prevDate.format('YYYY-MM-DD')} onChange={(e) => setPrevDate(dayjs(e.target.value))} />
                <span className="link" onClick={() => setPrevDate(dayjs().subtract(1, 'days'))}>1 day ago</span>
                <span className="link" onClick={() => setPrevDate(dayjs().subtract(2, 'days'))}>2 days ago</span>
                <span className="link" onClick={() => setPrevDate(dayjs().subtract(1, 'weeks'))}>1 week ago</span>
            </div>
            <details>
                <summary style={{ cursor: 'pointer' }}>
                    Ignore list
                </summary>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5em', flexDirection: 'row', marginTop: '0.5em' }}>
                    {toIgnore.map(record => <div key={record.type}>
                        <span className="clickable pill" onClick={() => unignore(record)}>
                            {record.name}
                        </span>
                    </div>)}
                </div>
            </details>
            <div className="responsive-row-or-col" style={{gap: "0.5em", justifyContent: 'center'}}>
                <table className="maintable">
                    <thead>
                        <tr>
                            <td rowSpan={2}>Type</td>
                            <td rowSpan={2}>Performance</td>
                            <td rowSpan={2}>MSRP</td>
                            <td colSpan={2}>Cheapest</td>
                            <td rowSpan={2}>{prevDate.format('YYYY-MM-DD')}</td>
                            <td rowSpan={2}>Curr Price</td>
                            <td rowSpan={2}>frame/price</td>
                            <td rowSpan={2}>δ</td>
                        </tr>
                        <tr>
                            <td>ever</td>
                            <td>30d</td>
                        </tr>
                    </thead>
                    <tbody>
                        {toShow.map(record => <GpuTableRow db={db} record={record} refresh={refreshValues} key={record.type} onClicked={() => ignore(record)} />)}
                    </tbody>
                </table>
                <Chart db={db} records={toShow} />
            </div>
        </div>
    </>
}