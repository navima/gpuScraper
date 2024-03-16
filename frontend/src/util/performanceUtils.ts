import { format } from "./stringUtils";

export function time<T>(message: string, f: () => Promise<T>): () => Promise<T> {
    const startTime = performance.now();
    return () => f().finally(() => {
        console.log(format(message, performance.now() - startTime));
    })
}

export function timeSync<T>(message: string, f: () => T): T {
    const startTime = performance.now();
    const res = f();
    console.log(format(message, performance.now() - startTime));
    return res
}