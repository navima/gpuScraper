export const except = function <T>(me: T[], other: Iterable<T>): T[] {
    const b1 = new Set(other)
    return [...new Set(me.filter((x: T) => !b1.has(x)))]
}