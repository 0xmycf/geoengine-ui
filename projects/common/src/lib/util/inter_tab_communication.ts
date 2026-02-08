
import { z } from 'zod';

export const PAYLOAD_TYPE_SCHEMA = z.enum([
    'update',
    'test',
    'tokenReq',
    'projectReq',
    'tokenResponse',
    'projectResponse',
    'ack',
]);

export const POST_MESSAGE_MESSAGE_SCHEMA = z.object({
    kind: PAYLOAD_TYPE_SCHEMA,
    data: z.string().nullable(),
});

export type PostMessageMessage = z.infer<typeof POST_MESSAGE_MESSAGE_SCHEMA>;

export function isPostMessageMessage(obj: unknown): boolean {
    const result = POST_MESSAGE_MESSAGE_SCHEMA.safeParse(obj);
    return result.success;
}
