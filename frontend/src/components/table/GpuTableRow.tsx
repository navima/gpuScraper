import { Dayjs } from "dayjs";
import { useEffect, useState } from "react";
import { Database } from "sql.js";

function deltaToColorString(delta: number | undefined): string {
    if (delta === undefined) return "initial";
    if (delta > 0) return "rgb(255,128,128)";
    if (delta < 0) return "rgb(128,255,128)";
    else return "yellow";
}

function formatPrice(value: number | undefined): string {
    if (value == undefined)
        return ""
    return Math.ceil(value / 1000).toString();
}

interface Props {
    db: Database,
    gpuType: string,
    prevDate: Dayjs,
    onClicked: () => void
}

export default function GpuTableRow({ db, gpuType, prevDate, onClicked }: Props) {
    let [perf, setPerf] = useState<number>()
    let [msrp, setMsrp] = useState<number>()
    let [currPrice, setCurrPrice] = useState<number>(0)
    let [prevPrice, setPrevPrice] = useState<number>(0)

    const delta = currPrice == 0 || prevPrice == 0 ? undefined : currPrice - prevPrice

    useEffect(() => {
        var f = async () => {
            var perf = db.exec(
                "select value from benchmarks where modelType=$type limit 1",
                { "$type": gpuType })?.[0]
            setPerf(Number.parseFloat(perf?.values?.[0]?.[0]?.toString() ?? "0"));

            var msrp = db.exec(
                "select msrp from models where type=$type limit 1",
                { "$type": gpuType })?.[0]
            setMsrp(Number.parseFloat(msrp?.values?.[0]?.[0]?.toString() ?? "0"));
        }
        f()
    }, [db, gpuType])

    useEffect(() => {
        var f = async () => {
            var currPrice = db.exec(
                "select price from articles where type=$type order by insertTime desc limit 1",
                { "$type": gpuType })?.[0]
            setCurrPrice(Number.parseFloat(currPrice?.values?.[0]?.[0]?.toString() ?? "0"));
        }
        f()
    }, [db, gpuType])

    useEffect(() => {
        var f = async () => {
            var prevPrice = db.exec(
                "select price from articles where type=$type and insertTime<$prevDate order by insertTime desc limit 1",
                {
                    "$type": gpuType,
                    "$prevDate": prevDate.format("YYYY-MM-DD")
                })?.[0]
            setPrevPrice(Number.parseFloat(prevPrice?.values?.[0]?.[0]?.toString() ?? "0"));
        }
        f()
    }, [db, gpuType, prevDate])

    return <>
        <tr>
            <td className="table-align-left" onClick={() => onClicked()}>{gpuType}</td>
            <td>{perf}</td>
            <td>{msrp}</td>
            <td>{formatPrice(prevPrice)}</td>
            <td>{formatPrice(currPrice)}</td>
            <td style={{ backgroundColor: deltaToColorString(delta) }}>{formatPrice(delta)}</td>
        </tr>
    </>
}