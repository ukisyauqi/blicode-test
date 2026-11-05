import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CategoryBadge, StatusBadge } from "@/components/reports/StatusBadge";
import { REPORT_CATEGORIES, REPORT_STATUSES, CATEGORY_META, STATUS_META } from "@/lib/constants";

describe("StatusBadge", () => {
  it("menampilkan label untuk semua status", () => {
    render(
      <div>
        {REPORT_STATUSES.map((status) => (
          <StatusBadge key={status} status={status} />
        ))}
      </div>,
    );

    for (const status of REPORT_STATUSES) {
      expect(screen.getByText(STATUS_META[status].label)).toBeInTheDocument();
    }
  });
});

describe("CategoryBadge", () => {
  it("menampilkan label untuk semua kategori", () => {
    render(
      <div>
        {REPORT_CATEGORIES.map((category) => (
          <CategoryBadge key={category} category={category} />
        ))}
      </div>,
    );

    for (const category of REPORT_CATEGORIES) {
      expect(screen.getByText(CATEGORY_META[category].label)).toBeInTheDocument();
    }
  });
});
