"""Backend agent — generates API routes, lib files, and Python stubs."""

import os
from .base_agent import BaseAgent

# Keyword → list of (rel_path, content_fn_key)
_BACKEND_ROUTES = [
    ("auth",         [("app/api/auth/route.ts", "auth_route"), ("lib/auth.ts", "auth_lib")]),
    ("login",        [("app/api/auth/route.ts", "auth_route"), ("lib/auth.ts", "auth_lib")]),
    ("billing",      [("app/api/billing/route.ts", "billing_route"), ("lib/billing.ts", "billing_lib")]),
    ("payment",      [("app/api/billing/route.ts", "billing_route"), ("lib/billing.ts", "billing_lib")]),
    ("subscription", [("app/api/billing/route.ts", "billing_route"), ("lib/billing.ts", "billing_lib")]),
    ("prisma",       [("prisma/schema.prisma", "prisma_schema")]),
    ("database",     [("prisma/schema.prisma", "prisma_schema")]),
    ("schema",       [("prisma/schema.prisma", "prisma_schema")]),
    ("admin",        [("app/api/admin/route.ts", "admin_route")]),
    ("member",       [("lib/members.ts", "members_lib")]),
    ("webhook",      [("app/api/webhooks/route.ts", "webhook_route")]),
    ("health",       [("app/api/health/route.ts", "health_route")]),
    ("email",        [("lib/email.ts", "email_lib")]),
    ("notification", [("lib/notifications.ts", "notifications_lib")]),
]


def _auth_route(title: str, description: str) -> str:
    return (
        'import { NextResponse } from "next/server";\n\n'
        "export async function POST(request: Request) {\n"
        "  const body = (await request.json()) as { email?: string; password?: string };\n"
        "  const { email, password } = body;\n"
        "  if (!email || !password) {\n"
        '    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });\n'
        "  }\n"
        "  // TODO: validate against database\n"
        "  const token = Buffer.from(`${email}:${Date.now()}`).toString(\"base64\");\n"
        '  return NextResponse.json({ token, email, expiresIn: 3600 });\n'
        "}\n\n"
        "export async function DELETE() {\n"
        '  return NextResponse.json({ message: "Logged out" });\n'
        "}\n"
    )


def _auth_lib(title: str, description: str) -> str:
    return (
        "export interface AuthToken {\n"
        "  email: string;\n"
        "  issuedAt: number;\n"
        "}\n\n"
        "const ONE_HOUR_MS = 3_600_000;\n\n"
        "export function verifyToken(token: string): AuthToken | null {\n"
        "  if (!token || typeof token !== \"string\") return null;\n"
        "  try {\n"
        "    const decoded = Buffer.from(token, \"base64\").toString(\"utf-8\");\n"
        "    const [email, timestamp] = decoded.split(\":\");\n"
        "    const issuedAt = parseInt(timestamp, 10);\n"
        "    if (!email || isNaN(issuedAt) || Date.now() - issuedAt > ONE_HOUR_MS) return null;\n"
        "    return { email, issuedAt };\n"
        "  } catch {\n"
        "    return null;\n"
        "  }\n"
        "}\n\n"
        "export function getUserFromToken(token: string): { email: string } | null {\n"
        "  const auth = verifyToken(token);\n"
        "  return auth ? { email: auth.email } : null;\n"
        "}\n"
    )


def _billing_route(title: str, description: str) -> str:
    return (
        'import { NextResponse } from "next/server";\n\n'
        "const PLANS = {\n"
        '  starter:    { price: 29,  maxMembers: 100,  features: ["Member management", "Basic reporting"] },\n'
        '  pro:        { price: 79,  maxMembers: 500,  features: ["Everything in Starter", "Class scheduling"] },\n'
        '  enterprise: { price: 199, maxMembers: -1,   features: ["Everything in Pro", "Unlimited members"] },\n'
        "} as const;\n\n"
        "export async function GET() {\n"
        "  return NextResponse.json({\n"
        "    plans: Object.entries(PLANS).map(([name, config]) => ({ name, ...config })),\n"
        "  });\n"
        "}\n\n"
        "export async function POST(request: Request) {\n"
        "  const body = (await request.json()) as { plan?: string; email?: string };\n"
        "  const plan = (body.plan ?? \"starter\") as keyof typeof PLANS;\n"
        "  if (!PLANS[plan]) {\n"
        '    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });\n'
        "  }\n"
        "  return NextResponse.json({ subscribed: true, plan, price: PLANS[plan].price, currency: \"USD\" });\n"
        "}\n"
    )


def _billing_lib(title: str, description: str) -> str:
    return (
        'export type Plan = "starter" | "pro" | "enterprise";\n\n'
        "export interface PlanConfig {\n"
        "  price: number;\n"
        "  maxMembers: number;\n"
        "  features: string[];\n"
        "}\n\n"
        "export const PLANS: Record<Plan, PlanConfig> = {\n"
        "  starter:    { price: 29,  maxMembers: 100,  features: [\"Member management\", \"Basic reporting\", \"Email support\"] },\n"
        "  pro:        { price: 79,  maxMembers: 500,  features: [\"Everything in Starter\", \"Class scheduling\", \"Billing automation\", \"Priority support\"] },\n"
        "  enterprise: { price: 199, maxMembers: -1,   features: [\"Everything in Pro\", \"Unlimited members\", \"Custom integrations\", \"Dedicated support\"] },\n"
        "};\n\n"
        "export function getPlanConfig(plan: Plan): PlanConfig {\n"
        "  return PLANS[plan];\n"
        "}\n\n"
        "export function isWithinPlanLimit(plan: Plan, memberCount: number): boolean {\n"
        "  const config = PLANS[plan];\n"
        "  return config.maxMembers === -1 || memberCount <= config.maxMembers;\n"
        "}\n"
    )


def _prisma_schema(title: str, description: str) -> str:
    return (
        'generator client {\n'
        '  provider = "prisma-client-js"\n'
        '}\n\n'
        'datasource db {\n'
        '  provider = "postgresql"\n'
        '  url      = env("DATABASE_URL")\n'
        '}\n\n'
        'enum Role {\n'
        '  USER\n'
        '  ADMIN\n'
        '  TRAINER\n'
        '}\n\n'
        'enum MemberStatus {\n'
        '  ACTIVE\n'
        '  INACTIVE\n'
        '  SUSPENDED\n'
        '}\n\n'
        'enum Plan {\n'
        '  STARTER\n'
        '  PRO\n'
        '  ENTERPRISE\n'
        '}\n\n'
        'model User {\n'
        '  id        String   @id @default(cuid())\n'
        '  email     String   @unique\n'
        '  name      String?\n'
        '  role      Role     @default(USER)\n'
        '  member    Member?\n'
        '  createdAt DateTime @default(now())\n'
        '  updatedAt DateTime @updatedAt\n'
        '}\n\n'
        'model Member {\n'
        '  id            String         @id @default(cuid())\n'
        '  userId        String         @unique\n'
        '  user          User           @relation(fields: [userId], references: [id])\n'
        '  status        MemberStatus   @default(ACTIVE)\n'
        '  plan          Plan           @default(STARTER)\n'
        '  joinedAt      DateTime       @default(now())\n'
        '  subscriptions Subscription[]\n'
        '}\n\n'
        'model Subscription {\n'
        '  id        String    @id @default(cuid())\n'
        '  memberId  String\n'
        '  member    Member    @relation(fields: [memberId], references: [id])\n'
        '  plan      Plan\n'
        '  price     Float\n'
        '  startDate DateTime  @default(now())\n'
        '  endDate   DateTime?\n'
        '  active    Boolean   @default(true)\n'
        '  createdAt DateTime  @default(now())\n'
        '}\n\n'
        'model GymClass {\n'
        '  id         String   @id @default(cuid())\n'
        '  name       String\n'
        '  instructor String\n'
        '  schedule   DateTime\n'
        '  capacity   Int      @default(20)\n'
        '  enrolled   Int      @default(0)\n'
        '  location   String?\n'
        '  createdAt  DateTime @default(now())\n'
        '}\n'
    )


def _admin_route(title: str, description: str) -> str:
    return (
        'import { NextResponse } from "next/server";\n\n'
        "export async function GET() {\n"
        '  return NextResponse.json({ status: "ok", role: "admin", timestamp: new Date().toISOString() });\n'
        "}\n\n"
        "export async function POST(request: Request) {\n"
        "  const body = await request.json();\n"
        '  return NextResponse.json({ processed: true, action: body.action ?? "unknown" });\n'
        "}\n"
    )


def _members_lib(title: str, description: str) -> str:
    return (
        "export interface Member {\n"
        "  id: string;\n"
        "  email: string;\n"
        "  name: string;\n"
        '  plan: "starter" | "pro" | "enterprise";\n'
        '  status: "active" | "inactive" | "suspended";\n'
        "  joinedAt: string;\n"
        "  lastVisit: string;\n"
        "}\n\n"
        "export function formatMember(m: Member): string {\n"
        "  return `${m.name} <${m.email}> — ${m.plan}`;\n"
        "}\n\n"
        "export function isActiveMember(m: Member): boolean {\n"
        '  return m.status === "active";\n'
        "}\n"
    )


def _webhook_route(title: str, description: str) -> str:
    return (
        'import { NextResponse } from "next/server";\n\n'
        "export async function POST(request: Request) {\n"
        "  const body = await request.json();\n"
        "  const event = body.type ?? \"unknown\";\n"
        "  console.log(`Webhook received: ${event}`);\n"
        "  // TODO: handle specific event types\n"
        '  return NextResponse.json({ received: true, event });\n'
        "}\n"
    )


def _health_route(title: str, description: str) -> str:
    return (
        'import { NextResponse } from "next/server";\n\n'
        "export async function GET() {\n"
        '  return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() });\n'
        "}\n"
    )


def _email_lib(title: str, description: str) -> str:
    return (
        "export interface EmailPayload {\n"
        "  to: string;\n"
        "  subject: string;\n"
        "  body: string;\n"
        "}\n\n"
        "export async function sendEmail(payload: EmailPayload): Promise<boolean> {\n"
        "  // TODO: integrate real email provider (Resend, SendGrid, etc.)\n"
        "  console.log(`[email] to=${payload.to} subject=${payload.subject}`);\n"
        "  return true;\n"
        "}\n"
    )


def _notifications_lib(title: str, description: str) -> str:
    return (
        "export type NotificationType = \"renewal\" | \"class_reminder\" | \"payment_failed\" | \"welcome\";\n\n"
        "export interface Notification {\n"
        "  type: NotificationType;\n"
        "  userId: string;\n"
        "  data: Record<string, unknown>;\n"
        "}\n\n"
        "export async function sendNotification(n: Notification): Promise<void> {\n"
        "  // TODO: dispatch via email / push\n"
        "  console.log(`[notify] ${n.type} → user ${n.userId}`);\n"
        "}\n"
    )


_CONTENT_FNS = {
    "auth_route":          _auth_route,
    "auth_lib":            _auth_lib,
    "billing_route":       _billing_route,
    "billing_lib":         _billing_lib,
    "prisma_schema":       _prisma_schema,
    "admin_route":         _admin_route,
    "members_lib":         _members_lib,
    "webhook_route":       _webhook_route,
    "health_route":        _health_route,
    "email_lib":           _email_lib,
    "notifications_lib":   _notifications_lib,
}


class BackendAgent(BaseAgent):
    name = "backend_agent"

    def run(self, task: dict, context: dict) -> dict:
        title = self.title(task)
        description = self.description(task)
        lowered = f"{title} {description}".lower()

        # Try to match a backend route set
        matched_routes = None
        for keyword, routes in _BACKEND_ROUTES:
            if keyword in lowered:
                matched_routes = routes
                break

        if matched_routes:
            files = {}
            for rel_path, fn_key in matched_routes:
                fn = _CONTENT_FNS.get(fn_key)
                content = fn(title, description) if fn else f"// {title}: {description}\n"
                print(f"  [{self.name}] generating {rel_path}")
                files[rel_path] = content
            return self._result(files, notes=f"Generated backend files for: {title}")

        # Fallback: Python stub (written to backend/ outside app_dir)
        # Signal to caller via special key
        slug = self.slug(task)
        stub_content = (
            f'"""{title}\n\n{description}\n"""\n\n\n'
            "def run():\n"
            f"    \"\"\"Execute: {title}\"\"\"\n"
            "    return {'status': 'stubbed', 'task': '" + title + "'}\n"
        )
        print(f"  [{self.name}] no SaaS target found — generating backend/{slug}.py stub")
        return self._result(
            {"__python_stub__": stub_content, "__python_slug__": slug},
            notes=f"Python stub for: {title}",
        )
