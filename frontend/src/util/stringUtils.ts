export function format(str: string, ...args: any[]) {
    return str.replace(/\{(\d+)\}/g, (match, index) => args[index]);
}