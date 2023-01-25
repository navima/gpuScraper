import { Dayjs } from "dayjs";
import { useEffect, useState } from "react";
import { Database } from "sql.js";

function deltaToColorString(delta: number | undefined): string {
    if (delta === undefined) return "initial";
    if (delta > 0) return "red";
    if (delta < 0) return "green";
    else return "yellow";
}

interface Props {
    db: Database,
    gpuType: string,
    prevDate: Dayjs,
    onClicked: () => void
}

export default function GpuTableRow({ db, gpuType, prevDate, onClicked }: Props) {
    let [currPrice, setCurrPrice] = useState<number>(0)
    let [prevPrice, setPrevPrice] = useState<number>(0)

    const delta = currPrice == 0 || prevPrice == 0 ? undefined : currPrice - prevPrice

    useEffect(() => {
        var f = async () => {
            var currPrice = db.exec(
                "select price from articles where type=$type order by insertTime desc limit 1",
                { "$type": gpuType })?.[0]
            setCurrPrice(Math.ceil(Number.parseFloat(currPrice?.values?.[0]?.[0]?.toString() ?? "0") / 1000));
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
            setPrevPrice(Math.ceil(Number.parseFloat(prevPrice?.values?.[0]?.[0]?.toString() ?? "0") / 1000));
        }
        f()
    }, [db, gpuType, prevDate])


    return <>
        <tr>
            <td onClick={() => onClicked()}>{gpuType}</td>
            <td>1</td>
            <td>2</td>
            <td>{prevPrice}</td>
            <td>{currPrice}</td>
            <td style={{ backgroundColor: deltaToColorString(delta) }}>{delta ?? ""}</td>
        </tr>
    </>
}