import { test as base, expect } from "@playwright/test";

import { installMockApi, type MockState } from "./mock-api";

export const test = base.extend<{ mockState: MockState }>({
  mockState: [
    async ({ page }, use) => {
      const state = await installMockApi(page);
      await use(state);
    },
    { auto: true },
  ],
});

export { expect };
