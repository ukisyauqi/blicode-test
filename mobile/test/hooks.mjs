// Native modul SecureStore tidak ada di Node; arahkan ke stub memori untuk tes.
export async function resolve(specifier, context, next) {
  if (specifier === "expo-secure-store") {
    return { url: new URL("./secure-store-stub.mjs", import.meta.url).href, shortCircuit: true };
  }
  return next(specifier, context);
}
