import React, { useEffect, useRef, useState } from "react";
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

interface Props {
    db: Database
}

export default function GpuTable({db}: Props) {
    const [prevDate, setPrevDate] = useState(dayjs().subtract(1, 'days'));
    const [records, setRecords] = useState<Record[]>([]);
    const [refreshValues, setRefreshValues] = useState(0);
    const [showChart, setShowChart] = useState(true);
    const [shouldShowChart, setShouldShowChart] = useState(true);
    const [startTime, setStartTime] = useState(dayjs().subtract(1, 'year'));

    const toIgnore = records.filter(r => r.ignored)
    const toShow = records.filter(r => !r.ignored)

    const chartTimer: React.MutableRefObject<number | undefined> = useRef();
    useEffect(() => {
        window.clearInterval(chartTimer.current)
        if (!shouldShowChart)
            setShowChart(false);
        else {
            console.log('deferred chart render')
            chartTimer.current = window.setTimeout(
                () => {
                    if (!showChart) {
                        console.log('actual chart render')
                        setShowChart(true);
                    }
                },
                1000);
        }
        // eslint-disable-next-line
    }, [shouldShowChart]);

    console.log("table render called");

    // Read ignore list from queryString or cookies
    useEffect(() => {
        if (!records! || records.length === 0)
            return;
        console.log('reading ignore list')
        let ignored: string[] = [];

        const searchParams = new URLSearchParams(window.location.search)
        const ignoredFromSearchParams = searchParams.get('ignored')
        console.log('ignored from search params:', ignoredFromSearchParams);
        if (ignoredFromSearchParams!) {
            ignored = ignoredFromSearchParams.split(',')
            console.log(`read ${ignored.length} ignored entries from queryString`)
        } else {
            const ignoredFromCookiesStr = Cookies.get('ignored')
            if (ignoredFromCookiesStr!) {
                ignored = JSON.parse(ignoredFromCookiesStr)
                console.log(`read ${ignored.length} ignored entries from cookies`)
            }
        }

        ignored.forEach(type => {
            const record = records.find(r => r.type === type)
            if (record!) {
                record.ignored = true
            } else {
                console.error(`"${type}" not found in records, which was`, records)
            }
        });
        persistIgnored(records) // synchronise cookies and queryString
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
                         LEFT JOIN (SELECT *
                                    FROM benchmarks
                                    WHERE type = '1440p;high;rtx') b ON modelType = m.type
            `)?.[0]
            setRecords(sortRecords(pseudoRecords.values.map(pr => {
                const [type, name, msrp, performance] = pr;
                const record = new Record();
                record.type = type?.toString() ?? "";
                record.name = name?.toString() ?? "";
                record.msrp = parseIntOrUndefined(msrp?.toString())
                if (msrp === 0) record.msrp = undefined;
                record.performance = parseIntOrUndefined(performance?.toString())
                return record;
            })))
        })
        f()
    }, [db])

    async function perRecordQuery(records: Record[]): Promise<void> {
        await time("per-record queries finished in {0}", async () => {
            console.log(`started per-record queries for ${records.length} types`)
            records.filter(r => !r.ignored).forEach(record => {
                const startTime = performance.now();
                record.prevDate = prevDate;
                const currPriceQueryRes = db.exec(
                    `
                        SELECT price
                        FROM articles
                        WHERE type = $type
                        ORDER BY insertTime DESC LIMIT 1
                    `,
                    {"$type": record.type})?.[0]
                record.currentPrice = parseIntOrUndefined(currPriceQueryRes?.values?.[0]?.[0]?.toString());

                const prevPriceQueryRes = db.exec(
                    `
                        SELECT price
                        FROM articles
                        WHERE type = $type
                          AND insertTime < $prevDate
                        ORDER BY insertTime DESC LIMIT 1
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
        })();
    }

    // Query additional data for records (initial for unignored)
    useEffect(() => {
        const f = () => {
            perRecordQuery(toShow)
                .then(refresh);
        }
        f()
        // eslint-disable-next-line
    }, [db, records, prevDate])

    function persistIgnored(records: Record[]) {
        const ignoredTypes = records
            .filter(r => r.ignored)
            .map(r => r.type)
        Cookies.set('ignored', JSON.stringify(ignoredTypes))
        const ignoredTypesStr = ignoredTypes.join(',')
        window.history.replaceState(null, '', window.location.pathname + '?ignored=' + ignoredTypesStr)
        console.log(`persisted ${ignoredTypes.length} ignores to cookies and queryString`)
    }

    /**
     * Ignore a record. (Also updates cookies and queryString)
     */
    function ignore(record: Record) {
        delayChartRender();
        console.log(`ignoring ${record.type}`)
        record.ignored = true;
        persistIgnored(records);
        setRefreshValues(refreshValues + 1);
    }

    /**
     * Un-Ignore a record. (Also updates cookies and queryString)
     */
    async function unignore(record: Record) {
        delayChartRender();
        record.ignored = false;
        persistIgnored(records);
        if (!record.cheapestEver!)
            await perRecordQuery([record])
        refresh();
    }

    async function delayChartRender() {
        setShouldShowChart(false);
        window.setTimeout(() => setShouldShowChart(true), 500);
    }

    function refresh() {
        setRefreshValues(refreshValues + 1);
    }

    return <>
        <div>
            <div style={{display: "flex", flexDirection: "row", gap: "0.5em"}}>
                <label htmlFor="prevDate">Last price date</label>
                <input id="prevDate" type={'date'} value={prevDate.format('YYYY-MM-DD')}
                       onChange={(e) => setPrevDate(dayjs(e.target.value))}/>
                <span className="link" onClick={() => setPrevDate(dayjs().subtract(1, 'days'))}>1 day ago</span>
                <span className="link" onClick={() => setPrevDate(dayjs().subtract(2, 'days'))}>2 days ago</span>
                <span className="link" onClick={() => setPrevDate(dayjs().subtract(1, 'weeks'))}>1 week ago</span>
                <label htmlFor="startTime">Chart start time</label>
                <input id="startTime" type={'date'} value={startTime.format('YYYY-MM-DD')}
                       onChange={(e) => setStartTime(dayjs(e.target.value))}/>
                <span className="link" onClick={() => setStartTime(dayjs().subtract(6, 'months'))}>6 months ago</span>
                <span className="link" onClick={() => setStartTime(dayjs().subtract(1, 'year'))}>1 year ago</span>
                <span className="link" onClick={() => setStartTime(dayjs().subtract(2, 'years'))}>2 years ago</span>
                <span className="link" onClick={() => setStartTime(dayjs().subtract(5, 'years'))}>5 years ago</span>
                <span className="link" onClick={() => setStartTime(dayjs().year(2020))}>lifetime</span>
            </div>
            <details>
                <summary style={{cursor: 'pointer'}}>
                    Ignore list
                </summary>
                <div
                    style={{display: 'flex', flexWrap: 'wrap', gap: '0.5em', flexDirection: 'row', marginTop: '0.5em'}}>
                    {toIgnore.map(record => <div key={record.type}>
                        <span className="clickable pill" onClick={async () => await unignore(record)}>
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
                    {toShow.map(record => <GpuTableRow db={db} record={record} refresh={refreshValues} key={record.type}
                                                       onClicked={() => ignore(record)}/>)}
                    </tbody>
                </table>
                <Chart db={db} records={toShow} shouldShow={showChart} startTime={startTime}/>
            </div>
        </div>
    </>
}