import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Pagination } from "@/components/ui/Pagination";

describe("Pagination", () => {
  it("menampilkan rentang data dan tombol prev/next", () => {
    render(
      <Pagination meta={{ page: 2, limit: 10, total: 35, totalPages: 4 }} onPageChange={vi.fn()} />,
    );

    expect(screen.getByText("11")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("35")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Halaman sebelumnya" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Halaman berikutnya" })).toBeEnabled();
  });

  it("memanggil onPageChange saat navigasi", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <Pagination
        meta={{ page: 2, limit: 10, total: 35, totalPages: 4 }}
        onPageChange={onPageChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Halaman berikutnya" }));
    expect(onPageChange).toHaveBeenCalledWith(3);

    await user.click(screen.getByRole("button", { name: "Halaman sebelumnya" }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("menonaktifkan tombol pada halaman pertama dan terakhir", () => {
    const { rerender } = render(
      <Pagination meta={{ page: 1, limit: 10, total: 10, totalPages: 1 }} onPageChange={vi.fn()} />,
    );

    expect(screen.getByRole("button", { name: "Halaman sebelumnya" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Halaman berikutnya" })).toBeDisabled();

    rerender(
      <Pagination meta={{ page: 2, limit: 10, total: 20, totalPages: 2 }} onPageChange={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "Halaman berikutnya" })).toBeDisabled();
  });

  it("memanggil onLimitChange saat ukuran halaman diubah", async () => {
    const user = userEvent.setup();
    const onLimitChange = vi.fn();
    render(
      <Pagination
        meta={{ page: 1, limit: 10, total: 35, totalPages: 4 }}
        onPageChange={vi.fn()}
        onLimitChange={onLimitChange}
      />,
    );

    await user.selectOptions(screen.getByRole("combobox", { name: "Baris per halaman" }), "20");
    expect(onLimitChange).toHaveBeenCalledWith(20);
  });
});
