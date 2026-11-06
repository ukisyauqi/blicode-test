type NominatimAddress = {
  road?: string;
  suburb?: string;
  village?: string;
  city_district?: string;
  postcode?: string;
};

type NominatimResponse = {
  address?: NominatimAddress;
};

const REVERSE_GEOCODE_TIMEOUT_MS = 5_000;

export type ResolvedLocation = {
  /** Nama daerah, mis. "Jalan Taman Suropati, Menteng, Jakarta Pusat". */
  address?: string;
  /** Kode pos, mis. "10310". */
  postalCode?: string;
};

/**
 * Ubah koordinat menjadi nama daerah + kode pos secara diam-diam (tanpa input user).
 * Memakai Nominatim (OpenStreetMap), gratis tanpa API key.
 * Gagal (offline/timeout/rate-limit) -> {}, submit tetap jalan.
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<ResolvedLocation> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return {};

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REVERSE_GEOCODE_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&lat=${latitude}&lon=${longitude}`,
      {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      },
    );
    if (!response.ok) return {};
    const data = (await response.json()) as NominatimResponse;
    const address = data.address;
    if (!address) return {};

    const area = [address.road, address.suburb ?? address.village, address.city_district]
      .map((part) => part?.trim())
      .filter((part): part is string => Boolean(part));
    const unique = [...new Set(area)];

    const result: ResolvedLocation = {};
    if (unique.length > 0) result.address = unique.join(", ");
    const postalCode = address.postcode?.trim();
    if (postalCode) result.postalCode = postalCode;
    return result;
  } catch {
    return {};
  } finally {
    clearTimeout(timeout);
  }
}
