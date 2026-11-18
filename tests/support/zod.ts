import { ZodError } from 'zod';

/**
 * 执行一段预期失败的校验，返回 ZodError 的 issues。
 */
export function zodIssues(run: () => unknown) {
    try {
        run();
    } catch (error) {
        if (error instanceof ZodError) {
            return error.issues;
        }
        throw error;
    }

    throw new Error('Expected a ZodError, but validation succeeded.');
}
