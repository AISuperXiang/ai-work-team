#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const START_MARKER = "<!-- ai-work-team:buildContext:start -->";
const END_MARKER = "<!-- ai-work-team:buildContext:end -->";
const MAX_FILES = 1200;
const MAX_READ_BYTES = 256 * 1024;
const MAX_PACKAGES = 200;
const IGNORE_DIRS = new Set([
  ".git",
  ".idea",
  ".vscode",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".next",
  ".nuxt",
  ".turbo",
  ".cache",
  "vendor",
  "target",
  "__pycache__",
]);

const DEP_CATEGORIES = [
  {
    name: "前端框架",
    keys: [
      "react",
      "react-dom",
      "next",
      "vue",
      "nuxt",
      "svelte",
      "@angular/core",
      "vite",
    ],
  },
  {
    name: "状态与数据管理",
    keys: [
      "zustand",
      "redux",
      "@reduxjs/toolkit",
      "mobx",
      "jotai",
      "recoil",
      "pinia",
      "@tanstack/react-query",
      "react-query",
      "swr",
      "apollo-client",
      "@apollo/client",
    ],
  },
  {
    name: "UI 组件与设计系统",
    keys: [
      "antd",
      "@arco-design/web-react",
      "@mui/material",
      "@chakra-ui/react",
      "@radix-ui/react-dialog",
      "shadcn-ui",
      "lucide-react",
      "framer-motion",
      "element-plus",
      "naive-ui",
    ],
  },
  {
    name: "样式与构建",
    keys: [
      "tailwindcss",
      "sass",
      "less",
      "styled-components",
      "@emotion/react",
      "postcss",
      "autoprefixer",
    ],
  },
  {
    name: "测试",
    keys: [
      "vitest",
      "jest",
      "@testing-library/react",
      "playwright",
      "@playwright/test",
      "cypress",
      "mocha",
      "pytest",
    ],
  },
  {
    name: "后端框架",
    keys: [
      "express",
      "koa",
      "fastify",
      "@nestjs/core",
      "hono",
      "prisma",
      "sequelize",
      "typeorm",
      "mongoose",
    ],
  },
];

function usage() {
  console.log(`Usage:
  node scripts/build-context.js <workdir> [--request "<需求>"] [--dry-run]
  node scripts/build-context.js <workdir> --output AGENTS.md
  node scripts/build-context.js <workdir> --json

Examples:
  node scripts/build-context.js /path/to/repo --request "为后续 /team build 构建上下文"
  node scripts/build-context.js ./workspace/xxx/demo --dry-run
`);
}

function getArgValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function positionalArgs() {
  const flagsWithValue = new Set(["--request", "--output"]);
  const result = [];
  for (let index = 2; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    if (flagsWithValue.has(arg)) {
      index += 1;
      continue;
    }
    if (arg.startsWith("--")) continue;
    result.push(arg);
  }
  return result;
}

function safeRead(filePath) {
  try {
    const stat = fs.statSync(filePath);
    if (!stat.isFile() || stat.size > MAX_READ_BYTES) return "";
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function walk(root) {
  const files = [];

  function visit(dir) {
    if (files.length >= MAX_FILES) return;
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (files.length >= MAX_FILES) return;
      if (entry.isDirectory()) {
        if (!IGNORE_DIRS.has(entry.name)) {
          visit(path.join(dir, entry.name));
        }
        continue;
      }
      if (entry.isFile()) {
        files.push(path.join(dir, entry.name));
      }
    }
  }

  visit(root);
  return files;
}

function rel(root, filePath) {
  return path.relative(root, filePath).split(path.sep).join("/");
}

function readPackageJson(root) {
  const packagePath = path.join(root, "package.json");
  if (!fs.existsSync(packagePath)) return undefined;
  try {
    const data = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    return {
      name: data.name,
      private: Boolean(data.private),
      workspaces: data.workspaces,
      scripts: data.scripts || {},
      dependencies: data.dependencies || {},
      devDependencies: data.devDependencies || {},
    };
  } catch {
    return undefined;
  }
}

function hasAny(files, names) {
  const fileNames = new Set(files.map((item) => path.basename(item)));
  return names.some((name) => fileNames.has(name));
}

function hasPath(files, pattern) {
  return files.some((file) => pattern.test(file));
}

function collectDependencies(pkg) {
  if (!pkg) return {};
  return {
    ...pkg.dependencies,
    ...pkg.devDependencies,
  };
}

function mergeDependencies(packages) {
  const merged = {};
  for (const item of packages) {
    Object.assign(merged, item.dependencies || {});
  }
  return merged;
}

function uniqueSorted(items) {
  return [...new Set(items.filter(Boolean))].sort();
}

function readPnpmWorkspacePatterns(root) {
  const workspacePath = path.join(root, "pnpm-workspace.yaml");
  if (!fs.existsSync(workspacePath)) {
    return [];
  }

  const content = safeRead(workspacePath);
  const lines = content.split(/\r?\n/);
  const patterns = [];
  let inPackages = false;

  for (const line of lines) {
    if (/^\s*packages\s*:\s*$/.test(line)) {
      inPackages = true;
      continue;
    }

    if (inPackages && /^\S/.test(line) && !/^\s*-/.test(line)) {
      inPackages = false;
    }

    if (!inPackages) {
      continue;
    }

    const match = line.match(/^\s*-\s+(.+?)\s*(#.*)?$/);
    if (match) {
      patterns.push(match[1].trim().replace(/^["']|["']$/g, ""));
    }
  }

  return patterns;
}

function readPackageWorkspacePatterns(pkg) {
  if (!pkg || !pkg.workspaces) {
    return [];
  }

  if (Array.isArray(pkg.workspaces)) {
    return pkg.workspaces;
  }

  if (Array.isArray(pkg.workspaces.packages)) {
    return pkg.workspaces.packages;
  }

  return [];
}

function splitWorkspacePatterns(patterns) {
  const positives = [];
  const negatives = [];

  for (const pattern of patterns) {
    if (!pattern || typeof pattern !== "string") continue;
    const normalized = pattern.replace(/\\/g, "/").replace(/\/+$/g, "");
    if (!normalized) continue;
    if (normalized.startsWith("!")) {
      negatives.push(normalized.slice(1));
    } else {
      positives.push(normalized);
    }
  }

  return { positives, negatives };
}

function escapeRegExp(value) {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

function globToRegExp(pattern) {
  const normalized = pattern.replace(/\\/g, "/").replace(/\/+$/g, "");
  let source = "";

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    const next = normalized[index + 1];
    if (char === "*" && next === "*") {
      source += ".*";
      index += 1;
      continue;
    }
    if (char === "*") {
      source += "[^/]*";
      continue;
    }
    source += escapeRegExp(char);
  }

  return new RegExp(`^${source}$`);
}

function matchesWorkspacePattern(relativeDir, pattern) {
  const normalizedDir = relativeDir.replace(/\\/g, "/").replace(/\/+$/g, "");
  return globToRegExp(pattern).test(normalizedDir);
}

function findPackageJsonDirs(root) {
  const packageDirs = [];

  function visit(dir) {
    if (packageDirs.length >= MAX_PACKAGES) return;
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.isDirectory() && !IGNORE_DIRS.has(entry.name)) {
        visit(path.join(dir, entry.name));
      }
    }

    if (
      entries.some((entry) => entry.isFile() && entry.name === "package.json")
    ) {
      packageDirs.push(dir);
    }
  }

  visit(root);
  return packageDirs;
}

function discoverWorkspace(root, rootPkg) {
  const pnpmPatterns = readPnpmWorkspacePatterns(root);
  const packageJsonPatterns = readPackageWorkspacePatterns(rootPkg);
  const allPatterns = [...pnpmPatterns, ...packageJsonPatterns];
  const { positives, negatives } = splitWorkspacePatterns(allPatterns);

  return {
    isMonorepo: positives.length > 0,
    sources: [
      ...(pnpmPatterns.length > 0
        ? [`pnpm-workspace.yaml：${pnpmPatterns.join(", ")}`]
        : []),
      ...(packageJsonPatterns.length > 0
        ? [`package.json workspaces：${packageJsonPatterns.join(", ")}`]
        : []),
    ],
    positives,
    negatives,
  };
}

function packageFilesForDir(packageRoot) {
  return walk(packageRoot);
}

function topLevelFiles(root) {
  try {
    return fs
      .readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => path.join(root, entry.name));
  } catch {
    return [];
  }
}

function scriptNames(pkg) {
  if (!pkg || !pkg.scripts) return [];
  const preferred = [
    "dev",
    "build",
    "test",
    "lint",
    "check",
    "typecheck",
    "preview",
  ];
  const names = Object.keys(pkg.scripts);
  return [
    ...preferred.filter((name) => names.includes(name)),
    ...names.filter((name) => !preferred.includes(name)).sort(),
  ];
}

function packageContext(root, packageRoot, packageManager, type, options = {}) {
  const pkg = readPackageJson(packageRoot);
  const files = options.rootOnly
    ? topLevelFiles(packageRoot)
    : packageFilesForDir(packageRoot);
  const deps = collectDependencies(pkg);
  const relativePath = rel(root, packageRoot) || ".";
  const signals = detectProjectSignals(packageRoot, files, pkg);

  return {
    type,
    path: relativePath,
    name: pkg?.name || relativePath,
    private: Boolean(pkg?.private),
    packageManager,
    dependencies: deps,
    roles: roleIndex(signals).map((item) => item.role),
    roleReasons: roleIndex(signals),
    dependencyCategories: categorizeDependencies(deps),
    directoryConventions: detectDirectoryConventions(packageRoot, files),
    configFiles: detectConfigFiles(packageRoot, files),
    scripts: scriptLines(pkg, packageManager),
    scriptNames: scriptNames(pkg),
    style: styleConventions(deps, files),
    filesScanned: files.length,
    hasPackageJson: Boolean(pkg),
  };
}

function discoverPackageContexts(root, rootPkg, packageManager, workspace) {
  const contexts = [];
  if (rootPkg) {
    contexts.push(
      packageContext(root, root, packageManager, "root", {
        rootOnly: workspace.isMonorepo,
      }),
    );
  }

  if (!workspace.isMonorepo) {
    return contexts;
  }

  const packageDirs = findPackageJsonDirs(root);
  const seen = new Set([root]);

  for (const dir of packageDirs) {
    if (seen.has(dir)) continue;
    const relativeDir = rel(root, dir);
    const included = workspace.positives.some((pattern) =>
      matchesWorkspacePattern(relativeDir, pattern),
    );
    const excluded = workspace.negatives.some((pattern) =>
      matchesWorkspacePattern(relativeDir, pattern),
    );
    if (included && !excluded) {
      contexts.push(packageContext(root, dir, packageManager, "workspace"));
      seen.add(dir);
    }
  }

  return contexts;
}

function categorizeDependencies(dependencies) {
  const depNames = Object.keys(dependencies || {});
  return DEP_CATEGORIES.map((category) => {
    const matched = depNames.filter((name) => category.keys.includes(name));
    return { name: category.name, matched };
  }).filter((category) => category.matched.length > 0);
}

function detectPackageManager(files) {
  if (hasAny(files, ["pnpm-lock.yaml"])) return "pnpm";
  if (hasAny(files, ["yarn.lock"])) return "yarn";
  if (hasAny(files, ["package-lock.json"])) return "npm";
  if (hasAny(files, ["bun.lockb"])) return "bun";
  return undefined;
}

function detectProjectSignals(root, files, pkg) {
  const relativeFiles = files.map((file) => rel(root, file));
  const deps = collectDependencies(pkg);
  const depNames = new Set(Object.keys(deps));
  const signals = {
    frontend: [],
    backend: [],
    ui: [],
    qa: [],
    techLead: ["需要维护项目级上下文、目录约束、依赖和后续 /team build 输入"],
  };

  if (
    depNames.has("react") ||
    depNames.has("vue") ||
    depNames.has("next") ||
    depNames.has("vite")
  ) {
    signals.frontend.push("package.json 命中前端框架依赖");
  }
  if (
    hasPath(
      relativeFiles,
      /^src\/(components|pages|app|views|hooks|store|stores)\//,
    )
  ) {
    signals.frontend.push("src 下存在组件、页面、hooks 或状态目录");
  }
  if (
    depNames.has("express") ||
    depNames.has("koa") ||
    depNames.has("fastify") ||
    depNames.has("@nestjs/core")
  ) {
    signals.backend.push("package.json 命中 Node 后端框架依赖");
  }
  if (
    hasAny(files, [
      "go.mod",
      "pyproject.toml",
      "requirements.txt",
      "Cargo.toml",
      "pom.xml",
      "build.gradle",
    ])
  ) {
    signals.backend.push("检测到后端语言或服务工程配置");
  }
  if (
    hasPath(
      relativeFiles,
      /^(api|server|cmd|internal|pkg|app|routes|controllers|services)\//,
    )
  ) {
    signals.backend.push("存在服务端常见目录");
  }
  if (
    depNames.has("tailwindcss") ||
    depNames.has("antd") ||
    depNames.has("@arco-design/web-react") ||
    depNames.has("@mui/material") ||
    depNames.has("lucide-react")
  ) {
    signals.ui.push("命中样式或 UI 组件库依赖");
  }
  if (
    hasPath(relativeFiles, /(^|\/)(styles?|scss|less|css)\//) ||
    hasPath(relativeFiles, /\.(scss|less|css)$/)
  ) {
    signals.ui.push("存在样式文件或样式目录");
  }
  if (
    depNames.has("vitest") ||
    depNames.has("jest") ||
    depNames.has("@playwright/test") ||
    depNames.has("cypress")
  ) {
    signals.qa.push("命中测试框架依赖");
  }
  if (
    hasPath(relativeFiles, /(^|\/)(__tests__|tests?|e2e)\//) ||
    hasPath(relativeFiles, /\.(test|spec)\.(ts|tsx|js|jsx)$/)
  ) {
    signals.qa.push("存在测试目录或测试文件");
  }

  return signals;
}

function roleIndex(signals) {
  const roles = [
    {
      role: "tech-lead",
      enabled: true,
      reason: signals.techLead.join("；"),
    },
    {
      role: "frontend-engineer",
      enabled: signals.frontend.length > 0,
      reason: signals.frontend.join("；"),
    },
    {
      role: "backend-engineer",
      enabled: signals.backend.length > 0,
      reason: signals.backend.join("；"),
    },
    {
      role: "ui-designer",
      enabled: signals.ui.length > 0,
      reason: signals.ui.join("；"),
    },
    {
      role: "qa-engineer",
      enabled: signals.qa.length > 0,
      reason: signals.qa.join("；"),
    },
  ];

  return roles.filter((item) => item.enabled);
}

function aggregatePackageRoles(packages) {
  const byRole = new Map();
  byRole.set("tech-lead", [
    "需要维护 monorepo 根上下文、子包边界、依赖矩阵和后续 /team build 输入",
  ]);

  for (const item of packages) {
    for (const role of item.roleReasons || []) {
      if (role.role === "tech-lead") {
        continue;
      }
      if (!byRole.has(role.role)) {
        byRole.set(role.role, []);
      }
      byRole.get(role.role).push(`${item.path}：${role.reason}`);
    }
  }

  return [...byRole.entries()].map(([role, reasons]) => ({
    role,
    enabled: true,
    reason: uniqueSorted(reasons).join("；"),
  }));
}

function detectDirectoryConventions(root, files) {
  const dirs = new Set();
  for (const file of files) {
    const parts = rel(root, file).split("/");
    for (let index = 1; index < parts.length; index += 1) {
      dirs.add(parts.slice(0, index).join("/"));
    }
  }

  const interesting = [
    "src",
    "src/components",
    "src/pages",
    "src/app",
    "src/views",
    "src/hooks",
    "src/store",
    "src/stores",
    "src/lib",
    "src/utils",
    "src/styles",
    "api",
    "server",
    "internal",
    "pkg",
    "cmd",
    "tests",
    "e2e",
    "docs",
  ];

  return interesting.filter((item) => dirs.has(item));
}

function detectConfigFiles(root, files) {
  const targets = [
    "package.json",
    "tsconfig.json",
    "vite.config.ts",
    "vite.config.js",
    "next.config.js",
    "tailwind.config.js",
    "postcss.config.js",
    "eslint.config.js",
    ".eslintrc",
    ".prettierrc",
    "go.mod",
    "pyproject.toml",
    "requirements.txt",
    "Dockerfile",
    "docker-compose.yml",
  ];
  const relative = new Set(files.map((file) => rel(root, file)));
  return targets.filter((item) => relative.has(item));
}

function scriptLines(pkg, packageManager) {
  if (!pkg || !pkg.scripts) return [];
  const preferred = [
    "dev",
    "build",
    "test",
    "lint",
    "check",
    "typecheck",
    "preview",
  ];
  return preferred
    .filter((name) => pkg.scripts[name])
    .map(
      (name) =>
        `- \`${packageManager || "npm"} run ${name}\`：${pkg.scripts[name]}`,
    );
}

function styleConventions(deps, files) {
  const lines = [];
  if (deps.tailwindcss)
    lines.push("检测到 Tailwind CSS，优先复用已有 utility/token 体系。");
  if (deps.sass || deps.less)
    lines.push("检测到 Sass/Less，新增样式应遵循现有预处理器组织方式。");
  if (deps.antd)
    lines.push("检测到 antd，优先复用 Ant Design 组件和交互规范。");
  if (deps["@arco-design/web-react"])
    lines.push("检测到 Arco Design，优先复用 Arco 组件和主题变量。");
  if (deps["@mui/material"])
    lines.push("检测到 MUI，优先复用 MUI 组件与主题。");
  if (deps["lucide-react"])
    lines.push("检测到 lucide-react，图标优先使用 lucide-react。");
  if (
    hasPath(
      files.map((file) => file.split(path.sep).join("/")),
      /\.(module\.)?(css|scss|less)$/,
    )
  ) {
    lines.push(
      "存在 CSS/SCSS/LESS 文件，新增组件需检查局部样式与全局样式边界。",
    );
  }
  return lines;
}

function buildContext(root, request) {
  const files = walk(root);
  const pkg = readPackageJson(root);
  const packageManager = detectPackageManager(files);
  const workspace = discoverWorkspace(root, pkg);
  const packages = discoverPackageContexts(
    root,
    pkg,
    packageManager,
    workspace,
  );
  const effectiveDeps =
    packages.length > 1
      ? mergeDependencies(packages)
      : collectDependencies(pkg);
  const dependencyCategories = categorizeDependencies(effectiveDeps);
  const signals = detectProjectSignals(root, files, pkg);
  const roles = workspace.isMonorepo
    ? aggregatePackageRoles(packages)
    : roleIndex(signals);
  const directoryConventions = detectDirectoryConventions(root, files);
  const configFiles = detectConfigFiles(root, files);
  const existingAgents = fs.existsSync(path.join(root, "AGENTS.md"));

  return {
    root,
    request,
    existingAgents,
    filesScanned: files.length,
    packageManager,
    packageName: pkg?.name,
    workspace,
    packages,
    roles,
    dependencyCategories,
    directoryConventions,
    configFiles,
    scripts: scriptLines(pkg, packageManager),
    style: styleConventions(effectiveDeps, files),
    hasPackageJson: Boolean(pkg),
  };
}

function listOrFallback(items, fallback) {
  return items.length > 0
    ? items.map((item) => `- ${item}`).join("\n")
    : `- ${fallback}`;
}

function categoryValues(pkg, categoryName) {
  const category = (pkg.dependencyCategories || []).find(
    (item) => item.name === categoryName,
  );
  return category ? category.matched : [];
}

function packageCell(values, fallback = "-") {
  const list = uniqueSorted(values);
  return list.length > 0
    ? list.map((item) => `\`${item}\``).join("<br>")
    : fallback;
}

function escapeTableCell(value) {
  return String(value || "-")
    .replace(/\|/g, "\\|")
    .replace(/\n/g, "<br>");
}

function renderPackageMatrix(context) {
  if (!context.workspace?.isMonorepo) {
    return "- 未检测到 `pnpm-workspace.yaml` 或 `package.json workspaces`，当前按单包项目处理。";
  }

  const rows = (context.packages || []).map((pkg) => {
    const framework = [
      ...categoryValues(pkg, "前端框架"),
      ...categoryValues(pkg, "后端框架"),
    ];
    const state = categoryValues(pkg, "状态与数据管理");
    const uiStyle = [
      ...categoryValues(pkg, "UI 组件与设计系统"),
      ...categoryValues(pkg, "样式与构建"),
    ];
    const tests = categoryValues(pkg, "测试");
    const scripts = pkg.scriptNames || [];
    const packageName =
      pkg.path === "."
        ? `root (${pkg.name || "package"})`
        : `${pkg.path} (${pkg.name || "package"})`;

    return [
      escapeTableCell(packageName),
      escapeTableCell(
        (pkg.roles || []).map((item) => `\`${item}\``).join("<br>") ||
          "`tech-lead`",
      ),
      packageCell(framework),
      packageCell(state),
      packageCell(uiStyle),
      packageCell(tests),
      packageCell(scripts, "未检测到"),
    ];
  });

  if (rows.length === 0) {
    return "- 检测到 workspace 配置，但未匹配到子包 package.json。";
  }

  return [
    "| Package | 角色 | 前端/后端框架 | 状态/数据 | UI/样式 | 测试 | scripts |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...rows.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n");
}

function renderContext(context) {
  const roleText = context.roles
    .map((item) => `- \`${item.role}\`：${item.reason}`)
    .join("\n");
  const dependencyText = context.dependencyCategories
    .map(
      (category) =>
        `- ${category.name}：${category.matched.map((item) => `\`${item}\``).join("、")}`,
    )
    .join("\n");
  const scriptText = context.scripts.join("\n");
  const styleText = context.style.join("\n- ");
  const workspaceText = context.workspace?.isMonorepo
    ? context.workspace.sources.join("；") || "检测到 workspace 配置"
    : "未检测到 workspace 配置";
  const packageMatrixText = renderPackageMatrix(context);

  return `${START_MARKER}
## AI Work Team Build Context

> 本区块由 \`/team buildContext\` / \`scripts/build-context.js\` 维护。已有人工内容请放在标记区块外。

### 更新范围

- 工作目录：\`${context.root}\`
- 用户需求：${context.request || "未提供，按目录静态扫描生成通用上下文"}
- AGENTS.md 状态：${context.existingAgents ? "已存在，仅更新 ai-work-team 管理区块" : "未存在，可创建初始 AGENTS.md"}
- 扫描文件数：${context.filesScanned}
- Monorepo：${context.workspace?.isMonorepo ? "是" : "否"}

### Agent 角色索引

${roleText || "- `tech-lead`：默认负责项目上下文、约束和技术判断"}

### 项目识别

- 包名：${context.packageName || "未检测到 package.json name"}
- 包管理器：${context.packageManager || "未检测到 lockfile"}
- Workspace 来源：${workspaceText}
- 配置文件：
${listOrFallback(context.configFiles, "未检测到常见配置文件")}

### 外部资源库与技术栈

${dependencyText || "- 未检测到 package.json 依赖；后续角色需要通过目录和代码进一步确认技术栈。"}

### Monorepo Package 技术栈矩阵

${packageMatrixText}

### 目录组织约束

${listOrFallback(
  context.directoryConventions.map((item) => `\`${item}\``),
  "未检测到常见目录约定；新增代码前需先读目录结构。",
)}

### 数据管理与状态上下文

${dependencyText.includes("状态与数据管理") ? "- 已检测到状态/数据管理依赖；新增功能应优先复用现有 store、query 或数据层模式。" : "- 未检测到明确状态管理库；新增状态前需先检查本地 store、hooks、services。"}

### UI 与样式规范

${styleText ? `- ${styleText}` : "- 未检测到明确 UI/样式库；新增 UI 前需先读现有组件、样式文件和设计约束。"}

### 可用命令

${scriptText || "- 未检测到 package scripts；执行验证前需先确认项目命令。"}

### 后续 /team build 使用约束

- 在设计或实现前，优先读取本文件、README、package/config 和相关模块。
- 角色只根据本项目已存在的技术栈、目录结构和样式约定新增实现。
- 若需求涉及前端，前端工程师需先确认组件目录、状态管理和 UI 组件库。
- 若需求涉及后端，后端工程师需先确认服务边界、接口目录、配置和测试命令。
- 若需求涉及技术方案，技术负责人需把本区块转成实现计划、风险和验证命令。
- 无法从静态扫描确认的约束，必须在技术方案中标记为待确认。
${END_MARKER}`;
}

function findManagedBlock(content) {
  const start = content.indexOf(START_MARKER);
  const end = content.indexOf(END_MARKER);
  if (start !== -1 && end !== -1 && end > start) {
    return {
      start,
      end,
      endMarkerLength: END_MARKER.length,
    };
  }

  return null;
}

function mergeAgents(existing, generatedBlock) {
  const block = findManagedBlock(existing);
  if (block) {
    return `${existing.slice(0, block.start)}${generatedBlock}${existing.slice(block.end + block.endMarkerLength)}`;
  }
  const separator = existing.trim().length > 0 ? "\n\n" : "";
  return `${existing}${separator}${generatedBlock}\n`;
}

function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    usage();
    return;
  }

  const args = positionalArgs();
  const target = args[0];
  if (!target) {
    usage();
    process.exit(1);
  }

  const root = path.resolve(process.cwd(), target);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    console.error(`Invalid workdir: ${root}`);
    process.exit(1);
  }

  const request = getArgValue("--request") || args.slice(1).join(" ");
  const dryRun = process.argv.includes("--dry-run");
  const json = process.argv.includes("--json");
  const outputName = getArgValue("--output") || "AGENTS.md";
  const outputPath = path.join(root, outputName);
  const context = buildContext(root, request);
  const generatedBlock = renderContext(context);
  const existing = fs.existsSync(outputPath)
    ? safeRead(outputPath)
    : "# AGENTS.md\n";
  const nextContent = mergeAgents(existing, generatedBlock);

  if (json) {
    console.log(JSON.stringify(context, null, 2));
    return;
  }

  if (dryRun) {
    console.log(nextContent);
    return;
  }

  fs.writeFileSync(outputPath, nextContent, "utf8");
  console.log(`Updated ${outputPath}`);
  console.log(`Scanned ${context.filesScanned} files.`);
  console.log(
    `Roles: ${context.roles.map((item) => item.role).join(", ") || "tech-lead"}`,
  );
}

main();
