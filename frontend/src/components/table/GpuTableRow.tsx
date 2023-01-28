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

interface Props {
    db: Database,
    record: Record,
    onClicked: () => void,
    refresh?: any
}

export default function GpuTableRow({ record, onClicked, refresh }: Props) {
    /*useEffect(() => {

    }, [record])*/

    const { name, msrp, performance, previousPrice: prevPrice, currentPrice: currPrice } = record;

    const delta = prevPrice! && currPrice! ? currPrice - prevPrice : 0;

    return <>
        <tr>
            <td className="table-align-left" onClick={() => onClicked()}>{name}</td>
            <td>{performance}</td>
            <td>{msrp}</td>
            <td>{formatPrice(prevPrice)}</td>
            <td>{formatPrice(currPrice)}</td>
            <td style={{ backgroundColor: deltaToColorString(delta) }}>{formatPrice(delta)}</td>
        </tr>
    </>
}