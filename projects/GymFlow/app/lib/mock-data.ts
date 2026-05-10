export type MemberStatus = "active" | "inactive" | "suspended";
export type MemberPlan = "starter" | "pro" | "enterprise";

export interface Member {
  id: string;
  name: string;
  email: string;
  plan: MemberPlan;
  status: MemberStatus;
  joined: string;
  lastVisit: string;
}

export interface GymClass {
  id: string;
  name: string;
  instructor: string;
  days: string;
  time: string;
  enrolled: number;
  capacity: number;
  location: string;
}

export interface Activity {
  id: string;
  text: string;
  time: string;
  type: "member" | "billing" | "class" | "system";
}

export const MEMBERS: Member[] = [
  { id: "1",  name: "Sarah Mitchell",   email: "sarah.m@example.com",   plan: "pro",        status: "active",    joined: "2025-01-15", lastVisit: "2026-05-09" },
  { id: "2",  name: "James Carter",     email: "j.carter@example.com",  plan: "pro",        status: "active",    joined: "2025-02-03", lastVisit: "2026-05-10" },
  { id: "3",  name: "Maria Gonzalez",   email: "mgonzalez@example.com", plan: "starter",    status: "active",    joined: "2025-02-18", lastVisit: "2026-05-08" },
  { id: "4",  name: "Tom Nakamura",     email: "tnakamura@example.com", plan: "enterprise", status: "active",    joined: "2024-11-20", lastVisit: "2026-05-10" },
  { id: "5",  name: "Emily Ross",       email: "e.ross@example.com",    plan: "pro",        status: "active",    joined: "2025-03-05", lastVisit: "2026-05-07" },
  { id: "6",  name: "David Kim",        email: "dkim@example.com",      plan: "starter",    status: "inactive",  joined: "2024-09-12", lastVisit: "2026-03-15" },
  { id: "7",  name: "Priya Sharma",     email: "psharma@example.com",   plan: "pro",        status: "active",    joined: "2025-04-01", lastVisit: "2026-05-09" },
  { id: "8",  name: "Chris Leblanc",    email: "cleblanc@example.com",  plan: "starter",    status: "active",    joined: "2025-01-28", lastVisit: "2026-05-06" },
  { id: "9",  name: "Amanda Foster",    email: "afoster@example.com",   plan: "pro",        status: "active",    joined: "2024-12-10", lastVisit: "2026-05-10" },
  { id: "10", name: "Michael Torres",   email: "mtorres@example.com",   plan: "enterprise", status: "active",    joined: "2024-10-05", lastVisit: "2026-05-08" },
  { id: "11", name: "Lisa Dupont",      email: "ldupont@example.com",   plan: "starter",    status: "suspended", joined: "2025-02-22", lastVisit: "2026-04-01" },
  { id: "12", name: "Ryan Walsh",       email: "rwalsh@example.com",    plan: "pro",        status: "active",    joined: "2025-03-17", lastVisit: "2026-05-09" },
  { id: "13", name: "Natalie Chen",     email: "nchen@example.com",     plan: "pro",        status: "active",    joined: "2025-04-11", lastVisit: "2026-05-10" },
  { id: "14", name: "Omar Hassan",      email: "ohassan@example.com",   plan: "starter",    status: "inactive",  joined: "2024-08-30", lastVisit: "2026-02-20" },
  { id: "15", name: "Sophie Bernard",   email: "sbernard@example.com",  plan: "pro",        status: "active",    joined: "2025-05-01", lastVisit: "2026-05-09" },
  { id: "16", name: "Alex Petrov",      email: "apetrov@example.com",   plan: "enterprise", status: "active",    joined: "2024-07-14", lastVisit: "2026-05-08" },
];

export const CLASSES: GymClass[] = [
  { id: "1", name: "Morning Yoga",       instructor: "Emma Chen",     days: "Mon/Wed/Fri", time: "7:00 AM",  enrolled: 14, capacity: 20, location: "Studio A" },
  { id: "2", name: "HIIT Bootcamp",      instructor: "Jake Rivera",   days: "Tue/Thu/Sat", time: "6:30 AM",  enrolled: 18, capacity: 20, location: "Main Floor" },
  { id: "3", name: "Spin Cycle",         instructor: "Mia Park",      days: "Mon/Wed/Fri", time: "12:00 PM", enrolled: 12, capacity: 15, location: "Cycle Room" },
  { id: "4", name: "Pilates Core",       instructor: "Layla Watts",   days: "Tue/Thu",     time: "9:00 AM",  enrolled: 9,  capacity: 12, location: "Studio B" },
  { id: "5", name: "Strength & Power",   instructor: "Marcus Hill",   days: "Mon/Wed/Fri", time: "5:30 PM",  enrolled: 16, capacity: 18, location: "Weight Room" },
  { id: "6", name: "Evening Zumba",      instructor: "Sofia Diaz",    days: "Tue/Thu",     time: "6:30 PM",  enrolled: 20, capacity: 20, location: "Main Floor" },
  { id: "7", name: "Stretch & Recovery", instructor: "Emma Chen",     days: "Wed/Sat",     time: "8:00 AM",  enrolled: 8,  capacity: 15, location: "Studio A" },
  { id: "8", name: "Boxing Basics",      instructor: "Danny Okafor",  days: "Mon/Thu/Sat", time: "7:00 PM",  enrolled: 11, capacity: 14, location: "Boxing Ring" },
  { id: "9", name: "Senior Fitness",     instructor: "Grace Liu",     days: "Tue/Fri",     time: "10:00 AM", enrolled: 7,  capacity: 12, location: "Studio B" },
];

export const REVENUE_MONTHS: { month: string; amount: number }[] = [
  { month: "Dec", amount: 6800 },
  { month: "Jan", amount: 7200 },
  { month: "Feb", amount: 7650 },
  { month: "Mar", amount: 7900 },
  { month: "Apr", amount: 8100 },
  { month: "May", amount: 8340 },
];

export const RECENT_ACTIVITY: Activity[] = [
  { id: "1", text: "James Carter renewed Pro membership",         time: "2 min ago",   type: "billing" },
  { id: "2", text: "Sophie Bernard joined as new member",         time: "18 min ago",  type: "member"  },
  { id: "3", text: "Evening Zumba reached full capacity",         time: "45 min ago",  type: "class"   },
  { id: "4", text: "Natalie Chen upgraded to Pro plan",           time: "1 hour ago",  type: "billing" },
  { id: "5", text: "Monthly invoices sent to 248 members",        time: "3 hours ago", type: "system"  },
  { id: "6", text: "Morning Yoga — 14/20 checked in",            time: "5 hours ago", type: "class"   },
  { id: "7", text: "Lisa Dupont membership suspended (overdue)",  time: "Yesterday",   type: "billing" },
];
