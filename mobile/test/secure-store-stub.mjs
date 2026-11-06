const store = new Map();

export async function getItemAsync(key) {
  return store.get(key) ?? null;
}

export async function setItemAsync(key, value) {
  store.set(String(key), String(value));
}

export async function deleteItemAsync(key) {
  store.delete(key);
}
