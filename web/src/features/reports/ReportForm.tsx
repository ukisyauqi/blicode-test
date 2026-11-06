import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Crosshair,
  ImagePlus,
  Info,
  Loader2,
  MapPin,
  Trash2,
} from "lucide-react";
import { Link } from "react-router-dom";

import { LocationPickerMap } from "@/components/map/ReportMap";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Input";
import { ReportPhoto } from "@/components/reports/ReportPhoto";
import { useToast } from "@/components/ui/toast-context";
import { useClassifyPhoto, useCreateReport, useUpdateReport } from "@/features/reports/hooks";
import {
  reportSchema,
  titleFromDescription,
  type ReportFormValues,
} from "@/features/reports/schemas";
import { reverseGeocode } from "@/features/reports/reverseGeocode";
import { ApiError } from "@/lib/api";
import {
  ALLOWED_PHOTO_TYPES,
  CATEGORY_META,
  DEFAULT_MAP_CENTER,
  MAX_PHOTO_SIZE,
  REPORT_CATEGORIES,
} from "@/lib/constants";
import { formatCategoryWithConfidence, formatPercent, getErrorMessage } from "@/lib/utils";
import type { ClassifyResult, Report, ReportCategory } from "@/types";

type ClassificationState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; result: ClassifyResult }
  | { status: "error"; message: string };

function PhotoClassificationPanel({
  classification,
  category,
}: {
  classification: ClassificationState;
  category: ReportCategory | undefined;
}) {
  if (classification.status === "idle") return null;

  if (classification.status === "loading") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <Loader2 className="h-4 w-4 animate-spin text-emerald-600" aria-hidden="true" />
        Menganalisis foto untuk menebak kategori…
      </div>
    );
  }

  if (classification.status === "error") {
    return (
      <div
        role="alert"
        className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
      >
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div>
          <p className="font-semibold">Klasifikasi otomatis gagal</p>
          <p className="mt-0.5 text-amber-700">
            {classification.message} Pilih kategori secara manual.
          </p>
        </div>
      </div>
    );
  }

  const { result } = classification;
  const confidence = result.confidence;

  return (
    <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          Kategori otomatis: {formatCategoryWithConfidence(result.category, confidence)}
        </div>
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
          Keyakinan {formatPercent(confidence, 1)}
        </span>
      </div>

      {result.needsReview && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Periksa kategori — keyakinan model di bawah 50%. Anda dapat mengubah pilihan di bawah.
        </div>
      )}

      {category && category !== result.category && (
        <p className="flex items-start gap-1.5 text-xs text-slate-600">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Anda mengubah kategori dari hasil model (
          {formatCategoryWithConfidence(result.category, confidence)}).
        </p>
      )}

      <div className="space-y-1.5">
        {REPORT_CATEGORIES.map((item) => (
          <div key={item} className="flex items-center gap-2 text-xs text-slate-600">
            <span className="w-14 shrink-0 font-medium">{CATEGORY_META[item].label}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.round((result.probabilities[item] ?? 0) * 100)}%`,
                  backgroundColor: CATEGORY_META[item].chartColor,
                }}
              />
            </div>
            <span className="w-10 shrink-0 text-right tabular-nums">
              {formatPercent(result.probabilities[item] ?? 0, 0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReportForm({
  report,
  onSuccess,
}: {
  report?: Report;
  onSuccess: (report: Report) => void;
}) {
  const isEdit = Boolean(report);
  const createMutation = useCreateReport();
  const updateMutation = useUpdateReport(report?.id ?? "");
  const classifyMutation = useClassifyPhoto();
  const { success, error: showError } = useToast();

  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [classification, setClassification] = useState<ClassificationState>({ status: "idle" });
  const [locating, setLocating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const classificationRequest = useRef(0);

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      description: report?.description ?? "",
      category: report?.category,
      latitude: report?.latitude ?? DEFAULT_MAP_CENTER.latitude,
      longitude: report?.longitude ?? DEFAULT_MAP_CENTER.longitude,
    },
  });

  const { errors } = form.formState;
  const latitude = useWatch({ control: form.control, name: "latitude" });
  const longitude = useWatch({ control: form.control, name: "longitude" });
  const mapLatitude = Number.isFinite(latitude) ? latitude : DEFAULT_MAP_CENTER.latitude;
  const mapLongitude = Number.isFinite(longitude) ? longitude : DEFAULT_MAP_CENTER.longitude;
  const classifying = classification.status === "loading";
  const submitting = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function setMapLocation(nextLatitude: number, nextLongitude: number) {
    form.setValue("latitude", Number(nextLatitude.toFixed(6)), {
      shouldValidate: true,
      shouldDirty: true,
    });
    form.setValue("longitude", Number(nextLongitude.toFixed(6)), {
      shouldValidate: true,
      shouldDirty: true,
    });
  }

  function validatePhotoFile(file: File): string | null {
    if (!ALLOWED_PHOTO_TYPES.includes(file.type as (typeof ALLOWED_PHOTO_TYPES)[number])) {
      return "Tipe file harus JPEG, PNG, atau WebP.";
    }
    if (file.size > MAX_PHOTO_SIZE) {
      return `Ukuran foto maksimal ${MAX_PHOTO_SIZE / (1024 * 1024)} MB.`;
    }
    return null;
  }

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const validationError = validatePhotoFile(file);
    if (validationError) {
      setPhotoError(validationError);
      setClassification({ status: "idle" });
      event.target.value = "";
      return;
    }

    setPhotoError(null);
    form.clearErrors("category");
    setPhoto(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));

    classificationRequest.current += 1;
    const requestId = classificationRequest.current;
    setClassification({ status: "loading" });

    classifyMutation.mutate(file, {
      onSuccess: (result) => {
        if (requestId !== classificationRequest.current) return;
        setClassification({ status: "success", result });
        form.setValue("category", result.category, { shouldValidate: true, shouldDirty: true });
      },
      onError: (classifyError) => {
        if (requestId !== classificationRequest.current) return;
        setClassification({ status: "error", message: getErrorMessage(classifyError) });
      },
    });
  }

  function removeNewPhoto() {
    classificationRequest.current += 1;
    setPhoto(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setClassification({ status: "idle" });
    setPhotoError(null);
    if (report) {
      form.setValue("category", report.category, { shouldValidate: true });
    } else {
      form.setValue("category", undefined, { shouldValidate: true });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      showError("Geolokasi tidak tersedia", "Perangkat ini tidak mendukung geolokasi.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setMapLocation(position.coords.latitude, position.coords.longitude);
        setLocating(false);
        success("Lokasi ditemukan", "Koordinat diisi dari lokasi perangkat Anda.");
      },
      (geoError) => {
        setLocating(false);
        const message =
          geoError.code === geoError.PERMISSION_DENIED
            ? "Izin lokasi ditolak. Pilih lokasi secara manual di peta."
            : "Lokasi tidak dapat diambil. Pilih lokasi secara manual di peta.";
        showError("Gagal mengambil lokasi", message);
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }

  async function onSubmit(values: ReportFormValues) {
    form.clearErrors("root");
    if (!isEdit && !photo) {
      setPhotoError("Foto wajib diunggah untuk membuat laporan.");
      return;
    }
    if (!isEdit && classification.status === "loading") {
      form.setError("root", {
        message: "Tunggu hasil deteksi kategori dari foto sebelum mengirim.",
      });
      return;
    }
    // Catatan: kalau deteksi client gagal, tetap lanjut —
    // backend mengklasifikasi ulang foto saat submit.

    try {
      const location =
        !isEdit || values.latitude !== report?.latitude || values.longitude !== report?.longitude
          ? await reverseGeocode(values.latitude, values.longitude)
          : { address: report?.address ?? undefined, postalCode: report?.postalCode ?? undefined };
      const payload = {
        ...values,
        title:
          isEdit && report ? report.title : titleFromDescription(values.description),
        address: location.address,
        postalCode: location.postalCode,
        category: values.category,
        photo,
      };
      const saved = isEdit
        ? await updateMutation.mutateAsync(payload)
        : await createMutation.mutateAsync(payload);
      success(
        isEdit ? "Laporan diperbarui" : "Laporan berhasil dibuat",
        isEdit ? "Perubahan laporan telah disimpan." : "Laporan Anda masuk ke antrean penanganan.",
      );
      onSuccess(saved);
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        for (const [path, message] of Object.entries(submitError.fieldErrors)) {
          if (
            path === "title" ||
            path === "description" ||
            path === "category" ||
            path === "address" ||
            path === "latitude" ||
            path === "longitude"
          ) {
            form.setError(path, { message });
          }
        }
        form.setError("root", { message: submitError.message });
      } else {
        form.setError("root", { message: getErrorMessage(submitError) });
      }
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {errors.root?.message && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{errors.root.message}</span>
        </div>
      )}

      <Card>
        <CardHeader
          title="Informasi laporan"
          description="Jelaskan sampah yang ingin dilaporkan dengan jelas."
        />
        <CardContent className="space-y-5">
          <Textarea
            label="Deskripsi"
            placeholder="Ceritakan kondisi sampah, perkiraan jumlah, dan hal lain yang perlu diketahui petugas…"
            error={errors.description?.message}
            rows={5}
            required
            {...form.register("description")}
          />

          <div>
            <p className="mb-2 block text-sm font-medium text-slate-700">
              Foto sampah <span className="text-rose-500">*</span>
            </p>

            {(previewUrl || (isEdit && report?.photoUrl)) && (
              <div className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Pratinjau foto laporan"
                    className="max-h-72 w-full object-cover"
                  />
                ) : (
                  <ReportPhoto
                    src={report?.photoUrl}
                    alt={`Foto laporan ${report?.title ?? ""}`}
                    aspect="max-h-72"
                  />
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                id="report-photo"
                type="file"
                accept={ALLOWED_PHOTO_TYPES.join(",")}
                className="sr-only"
                onChange={handlePhotoChange}
              />
              <Button
                variant="outline"
                size="sm"
                leftIcon={<ImagePlus className="h-4 w-4" aria-hidden="true" />}
                onClick={() => fileInputRef.current?.click()}
              >
                {previewUrl ? "Ganti foto" : "Pilih foto"}
              </Button>
              {photo && (
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
                  onClick={removeNewPhoto}
                >
                  Hapus foto baru
                </Button>
              )}
              <span className="text-xs text-slate-400">JPEG, PNG, atau WebP · maksimal 5 MB</span>
            </div>
            {photoError && (
              <p className="mt-2 text-xs font-medium text-rose-600" role="alert">
                {photoError}
              </p>
            )}
            {photo && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                {photo.name}
              </p>
            )}

            <div className="mt-3">
              <PhotoClassificationPanel
                classification={classification}
                category={
                  classification.status === "success" ? classification.result.category : undefined
                }
              />
            </div>
            {isEdit && report?.predictedCategory && (
              <p className="mt-2 text-xs text-slate-500">
                Prediksi model saat foto diunggah:{" "}
                <strong>
                  {formatCategoryWithConfidence(
                    report.predictedCategory,
                    report.predictedConfidence,
                  )}
                </strong>
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title="Lokasi"
          description="Klik peta atau geser marker untuk menandai lokasi sampah."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={useMyLocation}
              loading={locating}
              leftIcon={
                !locating ? <Crosshair className="h-4 w-4" aria-hidden="true" /> : undefined
              }
            >
              Gunakan lokasi saya
            </Button>
          }
        />
        <CardContent className="space-y-4">
          <LocationPickerMap
            latitude={mapLatitude}
            longitude={mapLongitude}
            onChange={setMapLocation}
          />

          <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
            <MapPin className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
            Koordinat terpilih: {mapLatitude.toFixed(6)}, {mapLongitude.toFixed(6)}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Link
          to={isEdit && report ? `/reports/${report.id}` : "/reports"}
          className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Batal
        </Link>
        <Button
          type="submit"
          size="lg"
          loading={submitting || classifying}
          disabled={classifying}
          leftIcon={
            !submitting && !classifying ? (
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            ) : undefined
          }
        >
          {classifying
            ? "Menunggu klasifikasi…"
            : submitting
              ? "Menyimpan…"
              : isEdit
                ? "Simpan perubahan"
                : "Kirim laporan"}
        </Button>
      </div>
    </form>
  );
}
