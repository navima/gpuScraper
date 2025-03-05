import Record from "./table/Record";
import { Database } from "sql.js";
import { parseIntOrUndefined } from "./table/GpuTable";
import { AxisOptions, Chart as ReactChart } from "react-charts";
import React from "react";
import { timeSync } from "../util/performanceUtils";
import Spinner from "./Spinner";
import dayjs, { Dayjs } from "dayjs";

interface Props {
    db: Database;
    records: Record[];
    shouldShow: boolean;
    startTime?: Dayjs;
}

type Datum = {
    value: number;
    date: Date;
}

type Series = {
    label: string;
    data: Datum[];
}

export default function Chart({ db, records, shouldShow }: Props) {
    const [resolution, setResolution] = React.useState(50);
    const [startTime, setStartTime] = React.useState(dayjs().subtract(1, 'year'));

    const data = React.useMemo(() => {
        if (!shouldShow)
            return;
        const minDateStr = db.exec('SELECT min(InsertTime) FROM articles')[0].values[0][0];
        const minDate = dayjs('' + minDateStr);
        const interval = Math.floor(dayjs().diff(startTime ?? minDate, 'second') / resolution);

        const result = timeSync('chart query finished in {0}ms', () => db.exec(`
            SELECT type,
                   round(avg(price / 1000))      avgPrice,
                   (strftime('%s', InsertTime) / $interval) * $interval AS timePeriod
            FROM articles
            WHERE type in (${records.map(r => `'${r.type}'`).join(',')}) 
                AND InsertTime > $startDate
            GROUP BY type, timePeriod
            `,
            {
                "$startDate": startTime?.format('YYYY-MM-DD') ?? '2000-01-01',
                "$interval": interval
            }));
        if (!result || !result.length || !result[0].values) {
            return [{
                label: 'no data',
                data: [{ date: new Date(), value: 0 }, { date: new Date('2022-01-01'), value: 0 }] as Datum[]
            }];
        }
        const [{ values }] = result;
        const datumMap = new Map<string, Datum[]>();
        for (const [type, avgPrice, timePeriod] of values) {
            if (!type || !avgPrice || !timePeriod) {
                continue;
            }

            const typeStr = type?.toString() ?? '';
            const avgPriceNum = parseIntOrUndefined(avgPrice?.toString())!;
            const dateStr = dayjs.unix(timePeriod as number).toDate();

            const datum = { value: avgPriceNum, date: dateStr };
            const datumArray = datumMap.get(typeStr) ?? [];
            datumArray.push(datum);
            datumMap.set(typeStr, datumArray);
        }
        const dataset: Series[] = [];
        for (const [type, datumArray] of datumMap) {
            dataset.push({ label: type, data: datumArray });
        }
        return dataset;
    }, [db, records, shouldShow, startTime, resolution]);

    const primaryAxis = React.useMemo(
        (): AxisOptions<Datum> => ({
            getValue: datum => datum.date,
        }),
        []
    )

    const secondaryAxes = React.useMemo(
        (): AxisOptions<Datum>[] => [
            {
                getValue: datum => datum.value,
            },
        ],
        []
    )

    if (!shouldShow || !data) // Data will always be populated if shouldShow is true, but TS can't know that
        return (
            <div style={{
                minWidth: '300px',
                minHeight: '300px',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                alignContent: 'center',
                justifyContent: 'center'
            }}>
                <Spinner />
            </div>);

    return (
        <div style={{ minWidth: '300px', minHeight: '300px', width: '100%' }}>
            <div>
                <label htmlFor="startTime">Chart start time</label>
                <input id="startTime" type={'date'} value={startTime.format('YYYY-MM-DD')}
                    onChange={(e) => setStartTime(dayjs(e.target.value))} />
                <span className="link" onClick={() => setStartTime(dayjs().subtract(6, 'months'))}>6 months ago&nbsp;</span>
                <span className="link" onClick={() => setStartTime(dayjs().subtract(1, 'year'))}>1 year ago&nbsp;</span>
                <span className="link" onClick={() => setStartTime(dayjs().subtract(2, 'years'))}>2 years ago&nbsp;</span>
                <span className="link" onClick={() => setStartTime(dayjs().subtract(5, 'years'))}>5 years ago&nbsp;</span>
                <span className="link" onClick={() => setStartTime(dayjs().year(2020))}>lifetime&nbsp;</span>
                <label htmlFor="resolution">Resolution: </label>
                <input id="resolution" type="range" min="1" max="100" value={resolution} onChange={e => setResolution(parseInt(e.target.value))} />
                {resolution}
            </div>
            <ReactChart
                options={{
                    data,
                    primaryAxis,
                    secondaryAxes,
                }}
            />
        </div>
    )
}