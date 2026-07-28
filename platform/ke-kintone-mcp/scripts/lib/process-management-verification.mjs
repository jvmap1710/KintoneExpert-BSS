import assert from "node:assert/strict";

const ASSIGNEE_TYPES = new Set(["ONE", "ALL", "ANY"]);
const ENTITY_TYPES = new Set([
  "USER",
  "GROUP",
  "ORGANIZATION",
  "FIELD_ENTITY",
  "CREATOR",
  "CUSTOM_FIELD",
]);

function normalizeEntity(item) {
  const type = item?.entity?.type;
  const code = type === "CREATOR" ? null : item?.entity?.code;
  return {
    entity: { type, code },
    includeSubs: Boolean(item?.includeSubs),
  };
}

function normalizeState(state) {
  return {
    name: state.name,
    index: String(state.index),
    assignee: {
      type: state.assignee?.type,
      entities: (state.assignee?.entities ?? []).map(normalizeEntity),
    },
  };
}

export function normalizeProcessSettings(settings) {
  const states = Object.values(settings.states ?? {})
    .map(normalizeState)
    .sort(
      (left, right) =>
        Number(left.index) - Number(right.index) ||
        left.name.localeCompare(right.name),
    );
  const actions = (settings.actions ?? []).map((action) => ({
    name: action.name,
    from: action.from,
    to: action.to,
    filterCond: action.filterCond ?? "",
  }));
  return {
    enable: settings.enable === true || settings.enable === "true",
    states,
    actions,
  };
}

export function validateProcessConfig(config) {
  if (typeof config !== "object" || Array.isArray(config) || config === null) {
    throw new Error("Process config must be a JSON object.");
  }
  if ("app" in config || "revision" in config) {
    throw new Error("Process config must not contain app or revision; pass App ID on the command line.");
  }
  if (typeof config.enable !== "boolean") {
    throw new Error("Process config enable must be boolean.");
  }
  if (!config.states || Array.isArray(config.states) || !Object.keys(config.states).length) {
    throw new Error("Process config must contain the complete non-empty states object.");
  }
  if (!Array.isArray(config.actions)) {
    throw new Error("Process config actions must be an array.");
  }

  const desiredNames = new Set();
  const indexes = [];
  for (const [sourceName, state] of Object.entries(config.states)) {
    if (!sourceName || !state?.name || state.name.length > 64) {
      throw new Error("Every state needs a source key and a name of at most 64 characters.");
    }
    if (desiredNames.has(state.name)) throw new Error(`Duplicate state name: ${state.name}.`);
    desiredNames.add(state.name);
    if (!/^\d+$/u.test(String(state.index))) {
      throw new Error(`State ${state.name} index must be a non-negative integer.`);
    }
    indexes.push(Number(state.index));
    if (!ASSIGNEE_TYPES.has(state.assignee?.type)) {
      throw new Error(`State ${state.name} has an invalid assignee type.`);
    }
    if (!Array.isArray(state.assignee.entities)) {
      throw new Error(`State ${state.name} assignee.entities must be an array.`);
    }
    for (const item of state.assignee.entities) {
      const type = item?.entity?.type;
      if (!ENTITY_TYPES.has(type)) {
        throw new Error(`State ${state.name} has an invalid assignee entity type.`);
      }
      if (type !== "CREATOR" && !item.entity.code) {
        throw new Error(`State ${state.name} assignee ${type} requires a code.`);
      }
    }
  }

  indexes.sort((left, right) => left - right);
  assert.deepEqual(
    indexes,
    indexes.map((_, index) => index),
    "State indexes must be contiguous and start at 0.",
  );
  const initialState = Object.values(config.states).find(
    (state) => Number(state.index) === 0,
  );
  if (initialState.assignee.type !== "ONE") {
    throw new Error("The initial state assignee type must be ONE.");
  }

  for (const action of config.actions) {
    if (!action?.name || action.name.length > 64) {
      throw new Error("Every action needs a name of at most 64 characters.");
    }
    if (!desiredNames.has(action.from) || !desiredNames.has(action.to)) {
      throw new Error(`Action ${action.name} references an unknown from/to state.`);
    }
    if (
      action.filterCond !== undefined &&
      typeof action.filterCond !== "string"
    ) {
      throw new Error(`Action ${action.name} filterCond must be a string.`);
    }
  }
  return config;
}

function actionIdentity(action) {
  return `${action.name}\u0000${action.from}\u0000${action.to}`;
}

export function findRemovedWorkflowItems(before, expected) {
  const expectedStateKeys = new Set(Object.keys(expected.states ?? {}));
  const expectedActions = new Set((expected.actions ?? []).map(actionIdentity));
  return {
    states: Object.keys(before.states ?? {}).filter(
      (name) => !expectedStateKeys.has(name),
    ),
    actions: (before.actions ?? [])
      .filter((action) => !expectedActions.has(actionIdentity(action)))
      .map((action) => ({
        name: action.name,
        from: action.from,
        to: action.to,
      })),
  };
}

export function validateFieldEntityCodes(config, properties) {
  const knownCodes = new Set(Object.keys(properties ?? {}));
  for (const state of Object.values(config.states ?? {})) {
    for (const item of state.assignee?.entities ?? []) {
      if (
        item.entity?.type === "FIELD_ENTITY" &&
        !knownCodes.has(item.entity.code)
      ) {
        throw new Error(
          `Assignee field code does not exist in the pre-live App: ${item.entity.code}.`,
        );
      }
    }
  }
}

export function verifyProcessSettings({ expected, actual, updateRevision }) {
  if (String(actual.revision) !== String(updateRevision)) {
    throw new Error(
      `Process revision mismatch: PUT returned ${updateRevision}, GET returned ${actual.revision}.`,
    );
  }
  assert.deepEqual(
    normalizeProcessSettings(actual),
    normalizeProcessSettings(expected),
    "Process Management read-back does not match the requested configuration.",
  );
  return {
    revision: String(actual.revision),
    enable: Boolean(actual.enable),
    states: Object.keys(actual.states ?? {}).length,
    actions: (actual.actions ?? []).length,
  };
}
