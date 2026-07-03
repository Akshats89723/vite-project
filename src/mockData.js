// Seed Mock Data for Virtual HR Manager

export const initialEmployees = [
  {
    id: "EMP001",
    name: "Akshat Sanghvi",
    email: "akshatsanghvi23@gmail.com",
    role: "Senior Frontend Engineer",
    department: "Engineering",
    status: "Active",
    avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150",
    joinDate: "2023-04-12",
    contact: "+91 98765 43210",
    manager: "Manager",
    attendance: "98%",
    performanceRating: "4.7",
    salary: "$115,000",
    goals: [
      { id: 1, title: "Optimize Web App performance index to 95+", done: true },
      { id: 2, title: "Mentor two junior frontend engineers", done: false },
      { id: 3, title: "Refactor legacy chat module components", done: false }
    ],
    reviews: [
      { reviewer: "Manager", relation: "Manager", rating: 5, comment: "Exemplary frontend development leadership. Highly proactive." },
      { reviewer: "Personal Assistant", relation: "Peer", rating: 4, comment: "Always helpful with UI styling, occasionally runs strict PR checks!" }
    ]
  },
  {
    id: "EMP002",
    name: "Harshil Rathod",
    email: "rharshil789@gmail.com",
    role: "Product Designer",
    department: "Design",
    status: "Active",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    joinDate: "2024-01-10",
    contact: "+1 (555) 019-2834",
    manager: "Evelyn Carter",
    attendance: "95%",
    performanceRating: "4.6",
    salary: "$95,000",
    goals: [
      { id: 1, title: "Conduct user testing sessions for HR portal redesign", done: true },
      { id: 2, title: "Create new product design language guideline", done: true },
      { id: 3, title: "Deliver final wireframes for analytics dashboard", done: false }
    ],
    reviews: [
      { reviewer: "Akshat Sanghvi", relation: "Peer", rating: 5, comment: "Her designs are clean, well-annotated and incredibly easy to translate to code." }
    ]
  },
  {
    id: "EMP003",
    name: "Marcus Stoinis",
    email: "marcus@company.com",
    role: "Talent Acquisition Specialist",
    department: "Human Resources",
    status: "Active",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    joinDate: "2022-09-01",
    contact: "+1 (555) 021-3948",
    manager: "Sarah Jenkins",
    attendance: "94%",
    performanceRating: "4.2",
    salary: "$80,000",
    goals: [
      { id: 1, title: "Reduce average Time-to-Hire to less than 21 days", done: false },
      { id: 2, title: "Onboard 15 new hires in Q3", done: true }
    ],
    reviews: [
      { reviewer: "Personal Assistant", relation: "Manager", rating: 4, comment: "Fabulous hiring results in technical departments." }
    ]
  },
  {
    id: "EMP004",
    name: "Evelyn Carter",
    email: "evelyn@company.com",
    role: "Engineering Manager",
    department: "Engineering",
    status: "Active",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150",
    joinDate: "2021-03-15",
    contact: "+1 (555) 073-9210",
    manager: "David Chen (VP)",
    attendance: "97%",
    performanceRating: "4.9",
    salary: "$145,000",
    goals: [
      { id: 1, title: "Scale engineering chapter to 25 developers", done: false },
      { id: 2, title: "Achieve 99.9% uptime compliance on core cloud stack", done: true }
    ],
    reviews: []
  },
  {
    id: "EMP005",
    name: "Liam Foster",
    email: "liam@company.com",
    role: "DevOps Engineer",
    department: "Engineering",
    status: "On Leave",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
    joinDate: "2023-11-20",
    contact: "+1 (555) 067-1123",
    manager: "Evelyn Carter",
    attendance: "89%",
    performanceRating: "4.4",
    salary: "$120,000",
    goals: [
      { id: 1, title: "Migrate CI/CD workflows to secure cluster layers", done: true }
    ],
    reviews: []
  }
];

export const initialLeaves = [
  {
    id: "LR001",
    requester: "Liam Foster",
    type: "Sick Leave",
    startDate: "2026-06-29",
    endDate: "2026-07-02",
    days: 4,
    status: "Approved",
    reason: "Severe fever and flu recovery."
  },
  {
    id: "LR002",
    requester: "Sophia Martinez",
    type: "Annual Leave",
    startDate: "2026-07-15",
    endDate: "2026-07-22",
    days: 6,
    status: "Pending",
    reason: "Summer holiday with family."
  },
  {
    id: "LR003",
    requester: "Akshat Patel",
    type: "Casual Leave",
    startDate: "2026-08-05",
    endDate: "2026-08-06",
    days: 2,
    status: "Pending",
    reason: "Personal bank and household paperwork."
  }
];

export const initialCandidates = [
  { id: "CAN001", name: "Daniel Craig", role: "React Developer", score: 88, stage: "Applied", email: "daniel@gmail.com" },
  { id: "CAN002", name: "Emily Watson", role: "UX Designer", score: 92, stage: "Screened", email: "emily@gmail.com" },
  { id: "CAN003", name: "Jared Leto", role: "DevOps Lead", score: 95, stage: "Interviewing", email: "jared@outlook.com" },
  { id: "CAN004", name: "Scarlett Johansson", role: "Tech Writer", score: 85, stage: "Offered", email: "scarlett@johansson.me" },
  { id: "CAN005", name: "Robert Downey", role: "AI Ethicist", score: 90, stage: "Applied", email: "robert@rdj.io" }
];

export const policies = [
  {
    id: "POL001",
    category: "General",
    title: "Hybrid Work Guidelines (3+2 Model)",
    summary: "All office staff are requested to collaborate in-person on Tuesdays, Wednesdays, and Thursdays. Mondays and Fridays are remote-first option days. Core operational window is 10:00 AM to 4:00 PM."
  },
  {
    id: "POL002",
    category: "Leave",
    title: "Annual Leave & Sick Policy Rules",
    summary: "Full-time employees receive 18 standard days of paid Annual Leave and 12 days of Sick/Casual Leave per calendar year. Leaves must be requested at least 7 working days in advance unless emergency applies."
  },
  {
    id: "POL003",
    category: "Security",
    title: "Information Security Compliance",
    summary: "Two-factor authentication is mandatory for all access points. Never store project source files on non-authorized personal devices. Run monthly system updates and utilize company enterprise VPN."
  },
  {
    id: "POL004",
    category: "Benefits",
    title: "Health & Wellness Coverage Package",
    summary: "Comprehensive corporate medical coverage covers employees up to $50,000, including visual checks, dental cleanups, and confidential mental wellness counselor support sessions (up to 10 free calls a year)."
  }
];

export const announcements = [
  { id: 1, title: "Company Q3 Townhall on Friday", date: "Today, 3:00 PM", body: "Join us for updates on our roadmap, fresh goals, and a Q&A panel.", type: "warning" },
  { id: 2, title: "VPN Infrastructure Migration scheduled", date: "July 2, 10:00 PM", body: "Core servers will be offline for 30 minutes. Complete key push actions before outage.", type: "danger" },
  { id: 3, title: "Welcome our new talent acquisitions!", date: "June 28", body: "Please greet Robert Downey and Jared Leto, joining code DevOps and UI next week.", type: "info" }
];

export const hrChatbotFaqs = [
  {
    keywords: ["leave", "holiday", "sick", "annual", "vacation"],
    response: "Under corporate policy POL002, full-time workers get 18 Annual Leave days combined with 12 Sick/Casual leave days. File requests in the 'Leave Management' tab. Standard requests require 7 days notice."
  },
  {
    keywords: ["hybrid", "work from home", "remote", "wfh", "office"],
    response: "We run a Hybrid 3+2 framework (POL001). Tuesdays, Wednesdays and Thursdays are in-office collaboration cycles. Mondays and Fridays are remote-optimal. Core bandwidth is 10 AM to 4 PM."
  },
  {
    keywords: ["insurance", "health", "medical", "wellness", "dental"],
    response: "Corporate health package POL004 includes standard medical coverage up to $50,000. It covers you, your spouse, and up to 2 kids. Contact benefits@company.com to add family dependants."
  },
  {
    keywords: ["vpn", "wifi", "password", "security", "device"],
    response: "Under POL003, IT infrastructure requires mandatory 2FA. Always run standard corporate VPN when accessing dev/prod sandboxes. Lock desktop nodes at all times. Connect to tech-support for security updates."
  },
  {
    keywords: ["salary", "payroll", "payslip", "direct deposit"],
    response: "Salaries are processed on the 28th date of each active month. Direct deposits take up to 24 hours. Payslips are downloadable under HR portal documentation (available soon)."
  }
];
