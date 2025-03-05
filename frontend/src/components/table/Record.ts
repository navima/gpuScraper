import { Dayjs } from "dayjs";

export default class Record {
    type!: string;
    name!: string;
    prevDate!: Dayjs;
    ignored: boolean = false;
    performance?: number;
    msrp?: number;
    currentPrice?: number;
    previousPrice?: number;
    cheapestPastMonth?: number;
    cheapestEver?: number;
    url?: string;
}