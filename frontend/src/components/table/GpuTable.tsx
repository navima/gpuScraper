import React, { useCallback, useEffect, useRef, useState } from "react";
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

export function parseIntOrUndefined(s: string | undefined | null): number | undefined {
    const value = Number.parseInt(s ?? "NaN");
    if (Number.isNaN(value)) return undefined;
    return value;
}

interface Props {
    db: Database
}

export default function GpuTable({ db }: Props) {
    const [prevDate, setPrevDate] = useState(dayjs().subtract(1, 'days'));
    const [records, setRecords] = useState<Record[]>([]);
    const [refreshValues, setRefreshValues] = useState(0);
    const [showChart, setShowChart] = useState(true);
    const [shouldShowChart, setShouldShowChart] = useState(true);
    const [minPerformance, setMinPerformance] = useState(0);
    const [maxPrice, setMaxPrice] = useState(Infinity);
    const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
    const [orderColumn, setOrderColumn] = useState('name');

    const toIgnore = records.filter(r => r.ignored)
    const toShow = records.filter(r => !r.ignored
        && (!r.performance || r.performance >= minPerformance)
        && (!r.cheapestPastMonth || r.cheapestPastMonth <= maxPrice * 1000)
        && (!showOnlyAvailable || r.cheapestPastMonth))

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

    const sortRecords = useCallback((records: Record[]) => {
        if (orderColumn === 'performance')
            return records.sort((a, b) => (a.performance ?? 0) - (b.performance ?? 0))
        records.sort((a, b) => compare(a.name, b.name))
        return records
    }, [orderColumn])

    // Query records
    useEffect(() => {
        const f = time("mass query finished in {0}", async () => {
            const pseudoRecords = db.exec(`
                select Type, Name, MSRP, value from models
                full join (select distinct type from articles) using(type)
                left join (select modeltype as type, value from benchmarks b where b.type = '1440p;ultra;raster') using(type)
            `)?.[0]
            setRecords(pseudoRecords.values.map(pr => {
                const [type, name, msrp, performance] = pr;
                const record = new Record();
                record.type = type?.toString() ?? "";
                record.name = name?.toString() ?? "";
                record.msrp = parseIntOrUndefined(msrp?.toString())
                if (msrp === 0) record.msrp = undefined;
                record.performance = parseIntOrUndefined(performance?.toString())
                return record;
            }))
        })
        f()
    }, [db])

    async function perRecordQuery(records: Record[]): Promise<void> {
        await time("per-record queries finished in {0}", async () => {
            console.log(`started per-record queries for ${records.length} types`)
            records.filter(r => !r.ignored).forEach(record => {
                const startTime = performance.now();
                const queryRes = db.exec(
                    `
                    WITH filtered_articles AS (
                        SELECT id, price, url, type, insertTime
                        FROM articles
                        WHERE type = $type
                        AND price IS NOT NULL AND price <> 0 
                        ORDER BY id DESC
                    ),
                    latest AS (
                        SELECT price AS currentPrice, url AS currentUrl
                        FROM filtered_articles 
                        LIMIT 1
                    ),
                    previous AS (
                        SELECT price AS previousPrice
                        FROM filtered_articles
                        WHERE insertTime < $prevDate
                        LIMIT 1
                    ),
                    cheapestMonth AS (
                        SELECT MIN(price) AS cheapestPastMonth
                        FROM filtered_articles
                        WHERE insertTime > $monthAgo
                    ),
                    cheapestAllTime AS (
                        SELECT MIN(price) AS cheapestEver
                        FROM filtered_articles
                    )
                    SELECT * 
                    FROM latest, previous, cheapestMonth, cheapestAllTime;
                    `,
                    {
                        "$type": record.type,
                        "$prevDate": prevDate.add(1, 'day').format("YYYY-MM-DD"),
                        "$monthAgo": dayjs().subtract(1, 'month').format("YYYY-MM-DD")
                    }
                )?.[0];

                record.currentPrice = parseIntOrUndefined(queryRes?.values?.[0]?.[0]?.toString());
                record.url = queryRes?.values?.[0]?.[1]?.toString();
                record.previousPrice = parseIntOrUndefined(queryRes?.values?.[0]?.[2]?.toString());
                record.cheapestPastMonth = parseIntOrUndefined(queryRes?.values?.[0]?.[3]?.toString());
                record.cheapestEver = parseIntOrUndefined(queryRes?.values?.[0]?.[4]?.toString());

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
            <div style={{ display: "flex", flexDirection: "row", gap: "0.5em" }}>
                <label htmlFor="prevDate">Last price date</label>
                <input id="prevDate" type={'date'} value={prevDate.format('YYYY-MM-DD')}
                    onChange={(e) => setPrevDate(dayjs(e.target.value))} />
                <span className="link" onClick={() => setPrevDate(dayjs().subtract(1, 'days'))}>1 day ago</span>
                <span className="link" onClick={() => setPrevDate(dayjs().subtract(2, 'days'))}>2 days ago</span>
                <span className="link" onClick={() => setPrevDate(dayjs().subtract(1, 'weeks'))}>1 week ago</span>
            </div>
            <details>
                <summary style={{ cursor: 'pointer' }}>
                    Ignore list
                </summary>
                <div
                    style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5em', flexDirection: 'row', marginTop: '0.5em' }}>
                    {toIgnore.map(record => <div key={record.type}>
                        <span className="clickable pill" onClick={async () => await unignore(record)}>
                            {record.name}
                        </span>
                    </div>)}
                </div>
            </details>
            <div style={{ display: "flex", flexDirection: "row", gap: "0.5em" }}>
                <label htmlFor="minPerformance">Min performance</label>
                <input id="minPerformance" type={'number'} value={minPerformance}
                    onChange={(e) => setMinPerformance(isNaN(Number.parseInt(e.target.value)) ? 0 : Number.parseInt(e.target.value))} />
                <label htmlFor="maxPrice">Max price</label>
                <input id="maxPrice" type={'number'} value={maxPrice}
                    onChange={(e) => setMaxPrice(isNaN(Number.parseInt(e.target.value)) ? 999 : Number.parseInt(e.target.value))} />
                <label htmlFor="showOnlyAvailable">Show only available</label>
                <input id="showOnlyAvailable" type={'checkbox'} checked={showOnlyAvailable}
                    onChange={(e) => setShowOnlyAvailable(e.target.checked)} />
                <label htmlFor="orderColumn">Order by</label>
                <select id="orderColumn" value={orderColumn} onChange={e => setOrderColumn(e.target.value)}>
                    <option value="name">Name</option>
                    <option value="performance">Performance</option>
                </select>
            </div>
            <div className="responsive-row-or-col" style={{ gap: "0.5em", justifyContent: 'center' }}>
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
                        {sortRecords(toShow).map(record => <GpuTableRow db={db} record={record} refresh={refreshValues} key={record.type}
                            onClicked={() => ignore(record)} />)}
                    </tbody>
                </table>
                <Chart db={db} records={toShow} shouldShow={showChart} />
            </div>
        </div>
    </>
}