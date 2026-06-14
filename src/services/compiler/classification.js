import {
  AUTH_ENDPOINT_SEGMENTS,
  UTILITY_ENDPOINT_SEGMENTS,
  AUTH_ENTITY,
  PAGE_ENDPOINT_SEGMENTS
} from "../../constants/compiler.js";

export const parseEndpointPath = (path) => {
  const cleanPath = path.replace(/^(GET|POST|PUT|DELETE|PATCH)\s+/i, "").split("?")[0].trim();
  const segments = cleanPath.toLowerCase().split("/").filter(Boolean);
  return { cleanPath, segments };
};

export const isUtilityEndpoint = (segments) =>
  segments.some((segment) =>
    UTILITY_ENDPOINT_SEGMENTS.has(segment.replace(/^:/, ""))
  );

export const isAuthEndpoint = (segments) =>
  segments.some((s) => {
    const seg = s.replace(/^:/, "");
    return (
      AUTH_ENDPOINT_SEGMENTS.has(seg) ||
      seg.includes("auth") ||
      seg.includes("login") ||
      seg.includes("token")
    );
  });

export const classifyEndpoint = (path) => {
  const { cleanPath, segments } = parseEndpointPath(path);
  const lowerPath = cleanPath.toLowerCase();

  if (isUtilityEndpoint(segments)) {
    return { type: "UTILITY", skipDb: true };
  }

  if (isAuthEndpoint(segments)) {
    return { type: "AUTH", skipDb: true };
  }

  if (
    segments.some((segment) =>
      PAGE_ENDPOINT_SEGMENTS.has(segment.replace(/^:/, ""))
    ) ||
    lowerPath.includes("dashboard") ||
    lowerPath.includes("profile")
  ) {
    return { type: "PAGE", skipDb: true };
  }

  return { type: "CRUD", skipDb: false };
};

export const findExistingTable = (entity, tables) => {
  if (!tables || !entity) return null;
  if (tables[entity]) return entity;
  const singular = entity.endsWith("s") ? entity.slice(0, -1) : entity;
  if (tables[singular]) return singular;
  const plural = entity + "s";
  if (tables[plural]) return plural;
  return null;
};

export const mapEndpointToEntity = (path, tables) => {
  const { cleanPath, segments } = parseEndpointPath(path);

  if (segments.length === 0) {
    return { cleanPath, entity: null, requiresMapping: false, skip: true, tableExists: false };
  }
  const classification = classifyEndpoint(path);

  console.debug(
    `[ENDPOINT CLASSIFY] ${path} → ${classification.type} (skipDb=${classification.skipDb})`
  );

  if (classification.skipDb) {
    return {
      cleanPath,
      entity: null,
      requiresMapping: false,
      skip: true,
      tableExists: false
    };
  }

  if (isUtilityEndpoint(segments)) {
    return { cleanPath, entity: null, requiresMapping: false, skip: true, tableExists: false };
  }

  if (isAuthEndpoint(segments)) {
    const matchedTable = findExistingTable(AUTH_ENTITY, tables);
    return {
      cleanPath,
      entity: AUTH_ENTITY,
      requiresMapping: true,
      skip: false,
      tableExists: !!matchedTable,
      matchedTable
    };
  }

  for (const segment of segments) {
    if (segment.startsWith(":")) continue;

    if (
      segment === "api" ||
      segment === "v1" ||
      segment === "v2" ||
      segment === "auth"
    ) {
      continue;
    }
    const matchedTable = findExistingTable(segment, tables);
    return {
      cleanPath,
      entity: segment,
      requiresMapping: true,
      skip: false,
      tableExists: !!matchedTable,
      matchedTable
    };
  }

  return { cleanPath, entity: null, requiresMapping: false, skip: true, tableExists: false };
};

export const logEndpointMapping = (mapping) => {
  console.debug(
    `Endpoint: ${mapping.cleanPath}\nMapped Entity: ${mapping.entity || "none"}\nTable Exists: ${mapping.tableExists}`
  );
};

export const endpointRequiresDbMapping = (path) => {
  const mapping = mapEndpointToEntity(path, {});
  return mapping.requiresMapping && !mapping.skip;
};

export const inferColumnType = (field) => {
  if (field.endsWith("_id") || field === "id") return "uuid";
  if (field.endsWith("_at") || field.endsWith("date")) return "timestamptz";
  if (field === "status" || field === "role") return "varchar(50)";
  return "varchar(255)";
};

export const createDefaultTable = (
  tableName,
  requestFields = [],
  responseFields = []
) => {
  const columns = {
    id: "uuid",
    created_at: "timestamptz"
  };

  const allFields = [
    ...requestFields,
    ...responseFields
  ];

  for (const field of allFields) {
    if (!field) continue;

    if (
      field.includes("[]") ||
      field.startsWith("Array<") ||
      field.includes("<") ||
      field.includes(">")
    ) {
      continue;
    }

    if (field !== "id" && field !== "created_at") {
      columns[field] = inferColumnType(field);
    }
  }

  return {
    columns,
    primary_key: "id",
    foreign_keys: {}
  };
};
