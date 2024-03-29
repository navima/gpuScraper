/* eslint eqeqeq:0 */
import { Database } from "sql.js";
import Record from "./Record";
import { FaEyeSlash } from "react-icons/fa6";

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
    if (!value && value == 0)
        return ""
    return value.toFixed(2).toString();
}

interface Props {
    db: Database,
    record: Record,
    onClicked: () => void,
    refresh?: any
}

export default function GpuTableRow({record, onClicked, refresh}: Props) {
    const {
        name,
        msrp,
        performance,
        previousPrice: prevPrice,
        currentPrice: currPrice,
        cheapestPastMonth,
        cheapestEver
    } = record;

    const delta = prevPrice! && currPrice! ? currPrice - prevPrice : 0;

    return <>
        <tr>
            <td className="table-align-left clickable" onClick={() => onClicked()}><FaEyeSlash size={12}
                                                                                               color={'gray'}/>&nbsp;{name}
            </td>
            <td>{performance}</td>
            <td>{msrp}</td>
            <td>{formatPrice(cheapestEver)}</td>
            <td>{formatPrice(cheapestPastMonth)}</td>
            <td>{formatPrice(prevPrice)}</td>
            <td style={{backgroundColor: cheapestPastMonth! && currPrice! && formatPrice(cheapestPastMonth) == formatPrice(currPrice) ? "rgb(128,255,128)" : "initial"}}>{formatPrice(currPrice)}</td>
            <td>{formatDecimal(1000 * (record.performance ?? 0) / (record.currentPrice ?? 1))}</td>
            <td style={{backgroundColor: deltaToColorString(delta)}}>{formatPrice(delta)}</td>
        </tr>
    </>
}