function entryIdentity(entry) {
  if (entry?.type === "URL") return `URL:${entry.url}`;
  if (entry?.type === "FILE") return `FILE:${entry.file?.name ?? entry.file?.fileKey}`;
  return `UNKNOWN:${JSON.stringify(entry)}`;
}

export function toUpdateEntry(entry) {
  if (entry?.type === "URL" && entry.url) {
    return { type: "URL", url: entry.url };
  }
  if (entry?.type === "FILE" && entry.file?.fileKey) {
    return { type: "FILE", file: { fileKey: entry.file.fileKey } };
  }
  throw new Error("Existing customization entry has an unsupported shape.");
}

export function toUpdateSettings(settings) {
  const convert = (entries) => (entries ?? []).map(toUpdateEntry);
  return {
    scope: settings.scope,
    desktop: {
      js: convert(settings.desktop?.js),
      css: convert(settings.desktop?.css),
    },
    mobile: {
      js: convert(settings.mobile?.js),
      css: convert(settings.mobile?.css),
    },
  };
}

export function verifyStagedFile({
  before,
  after,
  target,
  fileName,
  fileSize,
  updateRevision,
}) {
  if (String(after.revision) !== String(updateRevision)) {
    throw new Error(
      `Preview revision mismatch: PUT returned ${updateRevision}, GET returned ${after.revision}.`,
    );
  }
  if (after.scope !== before.scope) {
    throw new Error(
      `Preview scope changed unexpectedly: ${before.scope} -> ${after.scope}.`,
    );
  }

  const entries = after[target]?.js ?? [];
  const match = entries.find(
    (entry) =>
      entry.type === "FILE" &&
      entry.file?.name === fileName &&
      Number(entry.file?.size) === Number(fileSize),
  );
  if (!match) {
    throw new Error(
      `Preview verification failed: ${fileName} was not found in ${target}.js with size ${fileSize}.`,
    );
  }
  if (!match.file.contentType) {
    throw new Error(`Preview verification failed: ${fileName} has no content type.`);
  }

  const locations = [
    ["desktop", "js"],
    ["desktop", "css"],
    ["mobile", "js"],
    ["mobile", "css"],
  ];
  let preservedEntries = 0;
  for (const [device, resourceType] of locations) {
    const expected = (before[device]?.[resourceType] ?? []).map(entryIdentity);
    const actual = (after[device]?.[resourceType] ?? []).map(entryIdentity);
    let cursor = 0;
    for (const identity of expected) {
      const foundAt = actual.indexOf(identity, cursor);
      if (foundAt < 0) {
        throw new Error(
          `Preview verification failed: ${identity} disappeared or changed order in ${device}.${resourceType}.`,
        );
      }
      cursor = foundAt + 1;
    }
    preservedEntries += expected.length;
  }

  return {
    revision: String(after.revision),
    target,
    file: {
      name: match.file.name,
      contentType: match.file.contentType,
      size: String(match.file.size),
    },
    preservedEntries,
  };
}
