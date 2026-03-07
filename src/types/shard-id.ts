declare const __shardId: unique symbol;

/** Branded UUID string — prevents mixing arbitrary strings with shard IDs */
export type ShardId = string & { readonly [__shardId]: never };

/** Wrap a UUID string literal into a typed ShardId */
export function shardId(uuid: string): ShardId {
	return uuid as ShardId;
}
