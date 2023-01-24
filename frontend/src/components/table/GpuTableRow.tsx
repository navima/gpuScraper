import { Dayjs } from "dayjs";
import { useEffect, useState } from "react";
import { Database } from "sql.js";

interface Props {
    db: Database,
    gpuType: string,
    prevDate: Dayjs
}

export default function GpuTableRow({ db, gpuType, prevDate }: Props) {
    var [currPrice, setCurrPrice] = useState<number>(0)
    var [prevPrice, setPrevPrice] = useState<number>(0)

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
            <td>{gpuType}</td>
            <td>1</td>
            <td>2</td>
            <td>{prevPrice}</td>
            <td>{currPrice}</td>
            <td>{currPrice == 0 || prevPrice == 0 ? "" : currPrice - prevPrice}</td>
        </tr>
    </>
}