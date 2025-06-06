/* eslint eqeqeq:0 */
import { Database } from "sql.js";
import Record from "./Record";
import { FaEyeSlash } from "react-icons/fa6";
import { FiLink2 } from "react-icons/fi";

function deltaToColorString(delta: number | undefined): string {
    if (delta === undefined) return "initial";
    if (delta > 1000) return "rgb(255,128,128)";
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

export default function GpuTableRow({ record, onClicked, refresh }: Props) {
    const {
        name,
        msrp,
        performance,
        previousPrice: prevPrice,
        currentPrice: currPrice,
        cheapestPastMonth,
        cheapestEver,
        url
    } = record;

    const delta = cheapestPastMonth! && currPrice! ? currPrice - cheapestPastMonth : 0;

    return <>
        <tr>
            <td className="table-align-left clickable" onClick={onClicked}>
                <span style={{ display: "flex", alignItems: "center" }}>
                    <FaEyeSlash size={12} color={'gray'} />
                    {name}
                    {url &&
                        <a style={{ marginLeft: "auto" }} href={url} target="_blank" rel="noreferrer">
                            <FiLink2 size={12} color={'blue'} />
                        </a>
                    }
                </span>
            </td>
            <td>{performance}</td>
            <td>{msrp}</td>
            <td>{formatPrice(cheapestEver)}</td>
            <td>{formatPrice(cheapestPastMonth)}</td>
            <td>{formatPrice(prevPrice)}</td>
            <td style={{ backgroundColor: cheapestPastMonth! && currPrice! && formatPrice(cheapestPastMonth) == formatPrice(currPrice) ? "rgb(128,255,128)" : "initial" }}>{formatPrice(currPrice)}</td>
            <td>{formatDecimal(1000 * (performance ?? 0) / (currPrice ?? 1))}</td>
            <td style={{ backgroundColor: deltaToColorString(delta) }}>{formatPrice(delta)}</td>
        </tr>
    </>
}