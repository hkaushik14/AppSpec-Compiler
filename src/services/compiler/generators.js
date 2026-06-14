export function generateSQL(dbSchema) {
  if (!dbSchema || !dbSchema.tables) return "-- No DB schema available";
  let sql = `-- Auto-generated SQL Schema\n\n`;
  for (const [tableName, tableConfig] of Object.entries(dbSchema.tables)) {
    sql += `CREATE TABLE ${tableName} (\n`;
    const cols = [];
    const primaryKey = tableConfig.primary_key || "id";
    
    for (const [colName, colType] of Object.entries(tableConfig.columns || {})) {
      let colDef = `  ${colName} ${colType}`;
      if (colName === primaryKey) {
        colDef += " PRIMARY KEY";
      }
      cols.push(colDef);
    }
    
    for (const [colName, refTableCol] of Object.entries(tableConfig.foreign_keys || {})) {
      const parts = refTableCol.split('.');
      const refTable = parts[0];
      const refCol = parts[1] || "id";
      cols.push(`  FOREIGN KEY (${colName}) REFERENCES ${refTable}(${refCol}) ON DELETE CASCADE`);
    }
    
    sql += cols.join(",\n");
    sql += `\n);\n\n`;
  }
  return sql;
}

export function generateExpressRoutes(apiSchema) {
  if (!apiSchema || !apiSchema.endpoints) return "// No API schema available";
  let code = `// Auto-generated Express route stubs\n\n`;

  for (const endpoint of apiSchema.endpoints) {
    let method = (endpoint.method || "GET").toLowerCase();
    let path = endpoint.path || "/";
    const methodInPath = path.match(/^(GET|POST|PUT|DELETE|PATCH)\s+(.+)$/i);
    if (methodInPath) {
      method = methodInPath[1].toLowerCase();
      path = methodInPath[2];
    }

    code += `app.${method}("${path}", async (req, res) => {\n`;
    code += `  res.json({});\n`;
    code += `});\n\n`;
  }

  return code;
}

export function generatePages(uiSchema) {
  if (!uiSchema || !uiSchema.pages) return "// No UI schema available";
  let code = `// Auto-generated React page stubs\n\n`;

  for (const page of uiSchema.pages) {
    const pageName = page.name || "Page";
    const componentName = pageName.endsWith("Page") ? pageName : `${pageName}Page`;

    code += `export default function ${componentName}() {\n`;
    code += `  return (\n`;
    code += `    <div>\n`;
    code += `      ${pageName}\n`;
    code += `    </div>\n`;
    code += `  );\n`;
    code += `}\n\n`;
  }
  return code;
}

export function generateRuntimeCode(dbSchema, apiSchema, uiSchema) {
  return {
    sql: generateSQL(dbSchema),
    routes: generateExpressRoutes(apiSchema),
    pages: generatePages(uiSchema),
  };
}

export const generateAuthRules = (designOut) => {
  return {
    strategy: "jwt_refresh",
    providers: ["email_password", "google"],
    roles: designOut?.role_permissions || { admin: ["*"] },
    token_ttl: { access: "15m", refresh: "30d" },
    rate_limits: { login: "5/min", api: "200/min" }
  };
};

export const generateExecutionPlan = (designOut) => {
  const entityCount = Object.keys(designOut?.entities || {}).length;
  const services = [
    { name: "api", image: "node:20-alpine", port: 3000, replicas: 1 },
    { name: "postgres", image: "postgres:16", port: 5432, replicas: 1 },
  ];
  if (entityCount > 3) {
    services.push({ name: "redis", image: "redis:7-alpine", port: 6379, replicas: 1 });
  }
  return {
    runtime: "node20-alpine",
    deploy: "docker-compose",
    services,
    env_vars: entityCount > 3 ? ["DATABASE_URL", "JWT_SECRET", "REDIS_URL"] : ["DATABASE_URL", "JWT_SECRET"],
  };
};
