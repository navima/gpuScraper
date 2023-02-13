import { format } from "./stringUtils";

export function time<T>(message: string, f: () => Promise<T>): () => Promise<T> {
    const startTime = performance.now();
    return () => f().finally(() => {
        console.log(format(message, performance.now() - startTime));
    })
}