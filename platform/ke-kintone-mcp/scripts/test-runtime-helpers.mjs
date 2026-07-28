import assert from "node:assert/strict";
import {
  toUpdateSettings,
  verifyStagedFile,
} from "./lib/customization-verification.mjs";
import { buildKintoneAuthHeaders } from "./lib/kintone-rest.mjs";
import {
  findRemovedWorkflowItems,
  validateFieldEntityCodes,
  validateProcessConfig,
  verifyProcessSettings,
} from "./lib/process-management-verification.mjs";

const headers = buildKintoneAuthHeaders({
  KINTONE_USERNAME: "admin",
  KINTONE_PASSWORD: "secret",
  KINTONE_BASIC_AUTH_USERNAME: "gateway",
  KINTONE_BASIC_AUTH_PASSWORD: "front-door",
});
assert.equal(
  headers["X-Cybozu-Authorization"],
  Buffer.from("admin:secret").toString("base64"),
);
assert.equal(
  headers.Authorization,
  `Basic ${Buffer.from("gateway:front-door").toString("base64")}`,
);
assert.throws(
  () =>
    buildKintoneAuthHeaders(
      { KINTONE_API_TOKEN: "token" },
      { allowApiToken: false },
    ),
  /requires username\/password/u,
);

const before = {
  revision: "7",
  scope: "ALL",
  desktop: {
    js: [{ type: "URL", url: "https://cdn.example/existing.js" }],
    css: [],
  },
  mobile: { js: [], css: [] },
};
const pending = toUpdateSettings(before);
assert.deepEqual(pending.desktop.js, [
  { type: "URL", url: "https://cdn.example/existing.js" },
]);

const result = verifyStagedFile({
  before,
  after: {
    ...before,
    revision: "8",
    desktop: {
      ...before.desktop,
      js: [
        ...before.desktop.js,
        {
          type: "FILE",
          file: {
            fileKey: "stored-key-different-from-upload-key",
            name: "validation.js",
            contentType: "text/javascript",
            size: "123",
          },
        },
      ],
    },
  },
  target: "desktop",
  fileName: "validation.js",
  fileSize: 123,
  updateRevision: "8",
});
assert.equal(result.file.name, "validation.js");
assert.equal(result.preservedEntries, 1);

const processConfig = validateProcessConfig({
  enable: true,
  states: {
    "Not started": {
      name: "Draft",
      index: 0,
      assignee: { type: "ONE", entities: [] },
    },
    "Pending Manager": {
      name: "Pending Manager",
      index: 1,
      assignee: {
        type: "ONE",
        entities: [
          {
            entity: { type: "FIELD_ENTITY", code: "Approver" },
            includeSubs: false,
          },
        ],
      },
    },
  },
  actions: [
    {
      name: "Submit",
      from: "Draft",
      to: "Pending Manager",
      filterCond: "",
    },
  ],
});
const processResult = verifyProcessSettings({
  expected: processConfig,
  actual: {
    enable: true,
    revision: "12",
    states: {
      Draft: {
        name: "Draft",
        index: "0",
        assignee: { type: "ONE", entities: [] },
      },
      "Pending Manager": {
        name: "Pending Manager",
        index: "1",
        assignee: {
          type: "ONE",
          entities: [
            {
              entity: { type: "FIELD_ENTITY", code: "Approver" },
              includeSubs: false,
            },
          ],
        },
      },
    },
    actions: processConfig.actions,
  },
  updateRevision: "12",
});
assert.equal(processResult.states, 2);
assert.equal(processResult.actions, 1);
validateFieldEntityCodes(processConfig, { Approver: { type: "USER_SELECT" } });
assert.throws(
  () => validateFieldEntityCodes(processConfig, {}),
  /field code does not exist/u,
);
assert.deepEqual(
  findRemovedWorkflowItems(
    {
      states: {
        "Not started": {},
        "Pending Manager": {},
        Rejected: {},
      },
      actions: [
        { name: "Submit", from: "Draft", to: "Pending Manager" },
        { name: "Reject", from: "Pending Manager", to: "Rejected" },
      ],
    },
    processConfig,
  ),
  {
    states: ["Rejected"],
    actions: [
      { name: "Reject", from: "Pending Manager", to: "Rejected" },
    ],
  },
);
assert.throws(
  () =>
    validateProcessConfig({
      ...processConfig,
      actions: [{ name: "Bad", from: "Missing", to: "Draft" }],
    }),
  /unknown from\/to state/u,
);

console.log("Kintone REST runtime helper tests passed.");
