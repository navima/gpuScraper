import { Database } from "sql.js";
import Record from "./Record";

function deltaToColorString(delta: number | undefined): string {
    if (delta === undefined) return "initial";
    if (delta > 0) return "rgb(255,128,128)";
    if (delta < 0) return "rgb(128,255,128)";
    else return "yellow";
}

function formatPrice(value: number | undefined): string {
    if (!value!)
        return ""
    return Math.ceil(value / 1000).toString();
}

function formatDecimal(value: number): string {
    return value.toFixed(2)
}

interface Props {
    db: Database,
    record: Record,
    onClicked: () => void,
    refresh?: any
}

export default function GpuTableRow({ record, onClicked, refresh }: Props) {
    const { name, msrp, performance, previousPrice: prevPrice, currentPrice: currPrice, cheapestPastMonth } = record;

    const delta = prevPrice! && currPrice! ? currPrice - prevPrice : 0;

    return <>
        <tr>
            <td className="table-align-left clickable" onClick={() => onClicked()}>{name}</td>
            <td>{performance}</td>
            <td>{msrp}</td>
            <td>{formatPrice(cheapestPastMonth)}</td>
            <td>{formatPrice(prevPrice)}</td>
            <td>{formatPrice(currPrice)}</td>
            <td>{formatDecimal(1000 * (record.performance ?? 0) / (record.currentPrice ?? 1))}</td>
            <td style={{ backgroundColor: deltaToColorString(delta) }}>{formatPrice(delta)}</td>
        </tr>
    </>
}