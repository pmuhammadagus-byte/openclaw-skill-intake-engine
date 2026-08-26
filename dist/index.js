import { Type } from "typebox";
import { defineToolPlugin } from "openclaw/plugin-sdk/tool-plugin";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
const DEFAULT_MAX = 512 * 1024;
function redact(text) {
    return text
        .replace(/sk-[A-Za-z0-9_-]{12,}/g, "[REDACTED_API_KEY]")
        .replace(/ghp_[A-Za-z0-9]{20,}/g, "[REDACTED_GITHUB_TOKEN]")
        .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer[REDACTED]")
        .replace(/api[-_]?key\s*[:=]\s*[^\s,]+/gi, "api_key[REDACTED]")
        .replace(/password\s*[:=]\s*[^\s,]+/gi, "password[REDACTED]")
        .replace(/-----BEGIN [A-Z ]+ PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+ PRIVATE KEY-----/g, "[REDACTED_PRIVATE_KEY]");
}
function analyzeText(text) {
    const lower = text.toLowerCase();
    const findings = [];
    const warnings = [];
    const capabilities = [];
    const rules = [
        [/curl\s+|wget\s+/i, "network/download", "network access"],
        [/child_process|execSync|spawn\(|exec\(/i, "shell-execution", "shell execution"],
        [/rm\s+-rf|drop\s+database|truncate\s+/i, "destructive", "destructive operations"],
        [/process\.env|api[-_]?key|token|secret|password/i, "credential-access", "credential/config access"],
        [/github|git\s+/i, "git", "Git integration"],
        [/vercel/i, "deployment", "Vercel/deployment"],
        [/supabase/i, "database-service", "Supabase/database service"],
        [/browser|playwright|puppeteer/i, "browser-automation", "browser automation"],
        [/typescript|javascript|node\.js|python|coding/i, "coding", "software development"],
        [/http|https|fetch\(/i, "web", "HTTP/web access"],
    ];
    for (const [rx, capability, label] of rules) {
        if (rx.test(lower)) {
            if (!capabilities.includes(capability))
                capabilities.push(capability);
            if (["destructive", "credential-access", "shell-execution"].includes(capability)) {
                findings.push(label);
            }
            else {
                warnings.push(`Detected ${label}.`);
            }
        }
    }
    let risk = "LOW";
    if (findings.includes("credential/config access") || findings.includes("shell execution"))
        risk = "MEDIUM";
    if (findings.includes("destructive operations"))
        risk = "HIGH";
    return {
        capabilities,
        findings,
        warnings,
        risk,
        injectionSignals: [
            "ignore previous instructions",
            "reveal system prompt",
            "disable security",
            "bypass authorization",
        ].filter((x) => lower.includes(x)),
    };
}
export default defineToolPlugin({
    id: "skill-intake-engine",
    name: "Skill Intake & Integration Engine",
    description: "Analyze and validate OpenClaw skills before integration.",
    configSchema: Type.Object({
        maxReadBytes: Type.Optional(Type.Number({ minimum: 1024, maximum: 5000000 })),
    }),
    tools: (tool) => [
        tool({
            name: "skill_intake_analyze",
            label: "Analyze Skill",
            description: "Analyze a local OpenClaw skill file or directory without installing or executing it.",
            parameters: Type.Object({
                path: Type.String({ description: "Local path to the skill directory or primary skill file." }),
            }),
            outputSchema: Type.Object({
                path: Type.String(),
                kind: Type.String(),
                risk: Type.String(),
                capabilities: Type.Array(Type.String()),
                findings: Type.Array(Type.String()),
                warnings: Type.Array(Type.String()),
                injectionSignals: Type.Array(Type.String()),
                recommendation: Type.String(),
            }, { additionalProperties: false }),
            async execute({ path: inputPath }, config) {
                const target = path.resolve(inputPath);
                const s = await stat(target);
                let text = "";
                let kind = s.isDirectory() ? "directory" : "file";
                if (s.isFile()) {
                    const max = config.maxReadBytes ?? DEFAULT_MAX;
                    text = await readFile(target, "utf8");
                    text = text.slice(0, max);
                }
                else if (s.isDirectory()) {
                    const candidates = ["SKILL.md", "skill.md", "README.md", "package.json"];
                    for (const name of candidates) {
                        try {
                            text += `\n--- ${name} ---\n` + (await readFile(path.join(target, name), "utf8"));
                        }
                        catch {
                            // ignore missing candidate
                        }
                    }
                    text = text.slice(0, config.maxReadBytes ?? DEFAULT_MAX);
                }
                const result = analyzeText(redact(text));
                const recommendation = result.risk === "HIGH" ? "QUARANTINE_AND_REVIEW" :
                    result.risk === "MEDIUM" ? "SANDBOX_AND_REVIEW" :
                        "SAFE_TO_VALIDATE";
                return { path: target, kind, ...result, recommendation };
            },
        }),
        tool({
            name: "skill_intake_validate",
            label: "Validate Skill",
            description: "Perform structural validation checks on a local skill before integration. Does not install or execute the skill.",
            parameters: Type.Object({
                path: Type.String({ description: "Local skill directory." }),
            }),
            outputSchema: Type.Object({
                path: Type.String(),
                valid: Type.Boolean(),
                filesFound: Type.Array(Type.String()),
                missingRecommended: Type.Array(Type.String()),
                notes: Type.Array(Type.String()),
            }, { additionalProperties: false }),
            async execute({ path: inputPath }) {
                const target = path.resolve(inputPath);
                const s = await stat(target);
                if (!s.isDirectory()) {
                    return {
                        path: target,
                        valid: false,
                        filesFound: [],
                        missingRecommended: ["skill directory"],
                        notes: ["Path is not a directory."],
                    };
                }
                const expected = ["SKILL.md", "skill.md", "README.md", "package.json"];
                const filesFound = [];
                for (const name of expected) {
                    try {
                        await stat(path.join(target, name));
                        filesFound.push(name);
                    }
                    catch {
                        // ignore
                    }
                }
                const hasSkill = filesFound.includes("SKILL.md") || filesFound.includes("skill.md");
                const notes = [
                    "Validation is structural only; it does not prove the skill is safe or correct.",
                    "Execution/install should be performed only after security review and sandbox testing.",
                ];
                return {
                    path: target,
                    valid: hasSkill,
                    filesFound,
                    missingRecommended: hasSkill ? [] : ["SKILL.md"],
                    notes,
                };
            },
        }),
        tool({
            name: "skill_intake_registry_entry",
            label: "Create Skill Registry Entry",
            description: "Create a normalized registry record from supplied skill metadata. Does not install or enable a skill.",
            parameters: Type.Object({
                name: Type.String(),
                version: Type.Optional(Type.String()),
                category: Type.String(),
                capabilities: Type.Array(Type.String()),
                triggers: Type.Array(Type.String()),
                risk: Type.Union([
                    Type.Literal("LOW"),
                    Type.Literal("MEDIUM"),
                    Type.Literal("HIGH"),
                    Type.Literal("CRITICAL"),
                ]),
                source: Type.String(),
                status: Type.Union([
                    Type.Literal("DISCOVERED"),
                    Type.Literal("ANALYZING"),
                    Type.Literal("TESTING"),
                    Type.Literal("APPROVED"),
                    Type.Literal("ACTIVE"),
                    Type.Literal("BLOCKED"),
                    Type.Literal("QUARANTINED"),
                ]),
            }),
            execute(params) {
                return {
                    schemaVersion: 1,
                    ...params,
                    createdAt: new Date().toISOString(),
                    policy: "metadata-only; no automatic install or enable",
                };
            },
        }),
    ],
});
