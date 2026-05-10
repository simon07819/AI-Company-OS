import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  }

  // TODO: validate against database
  const token = Buffer.from(`${email}:${Date.now()}`).toString("base64");
  return NextResponse.json({ token, email, expiresIn: 3600 });
}

export async function DELETE() {
  return NextResponse.json({ message: "Logged out" });
}
