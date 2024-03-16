import Record from "./table/Record";
import { Database } from "sql.js";
import { parseIntOrUndefined } from "./table/GpuTable";
import { AxisOptions, Chart as ReactChart } from "react-charts";
import React from "react";
import { timeSync } from "../util/performanceUtils";
import Spinner from "./Spinner";

interface Props {
    db: Database;
    records: Record[];
    shouldShow: boolean;
}

type Datum = {
    value: number;
    date: Date;
}

type Series = {
    label: string;
    data: Datum[];
}

export default function Chart({db, records, shouldShow}: Props) {

    const data = React.useMemo(() => {
        if (!shouldShow)
            return;
        const result = timeSync('chart query finished in {0}ms', () => db.exec(`
            SELECT type,
                   round(avg(price / 1000))      avgPrice,
                   strftime('%Y-%m', InsertTime) month
            FROM articles
            WHERE type in (${records.map(r => `'${r.type}'`).join(',')})
            GROUP BY type, month
            ORDER BY type`));
        if (!result || !result.length || !result[0].values) {
            return [{
                label: 'no data',
                data: [{date: new Date(), value: 0}, {date: new Date('2022-01-01'), value: 0}] as Datum[]
            }];
        }
        const [{values}] = result;
        const datumMap = new Map<string, Datum[]>();
        for (const [type, avgPrice, month] of values) {
            if (!type || !avgPrice || !month) {
                continue;
            }

            const typeStr = type?.toString() ?? '';
            const avgPriceNum = parseIntOrUndefined(avgPrice?.toString())!;
            const dateStr = new Date(month?.toString() ?? '');

            const datum = {value: avgPriceNum, date: dateStr};
            const datumArray = datumMap.get(typeStr) ?? [];
            datumArray.push(datum);
            datumMap.set(typeStr, datumArray);
        }
        const dataset: Series[] = [];
        for (const [type, datumArray] of datumMap) {
            dataset.push({label: type, data: datumArray});
        }
        return dataset;
    }, [db, records, shouldShow]);

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
                <Spinner/>
            </div>);

    return (
        <div style={{minWidth: '300px', minHeight: '300px', width: '100%'}}>
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