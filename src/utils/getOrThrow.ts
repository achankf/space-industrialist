interface Collection<K, V> {
  get(key: K): V | undefined;
}

export function getOrThrow<K, V>(
  collection: Collection<K, V>,
  key: K,
  elseErrorMsg: string
): V {
  const ret = collection.get(key);
  if (!ret) {
    throw new Error(elseErrorMsg);
  }
  return ret;
}
