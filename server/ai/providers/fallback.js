export const RULES = [
  {
    patterns: [/\b(wfh|work.?from.?home|remote|hybrid|office|work\s+policy)\b/i],
    response: "Our hybrid model has you in-office on Tuesdays, Wednesdays, and Thursdays. Mondays and Fridays are remote-friendly. Core collaboration hours are 10 AM to 4 PM.",
  },
  {
    patterns: [/\b(annual.?leave|vacation|holiday|days.?off|pto)\b/i],
    response: "Full-time employees get 18 days of paid Annual Leave per year. Requests should be submitted at least 7 working days in advance through the Leave Manager tab.",
  },
  {
    patterns: [/\b(sick.?leave|sick|ill|unwell|medical.?leave)\b/i],
    response: "You have 12 Sick/Casual Leave days per year. For emergencies, submit your leave in the Leave Manager tab.",
  },
  {
    patterns: [/\b(insurance|health|medical|dental|wellness|coverage)\b/i],
    response: "The company health package covers up to $50,000 per year including medical, dental, and mental wellness sessions.",
  },
  {
    patterns: [/\b(salary|payroll|pay|payslip|deposit|payment)\b/i],
    response: "Salaries are processed on the 28th of each month. Direct deposits arrive within 24 hours.",
  },
  {
    patterns: [/\b(hello|hi|hey|good\s+(morning|afternoon|evening))\b/i],
    response: "Hello! I'm Pep, your Virtual HR Assistant. I can help with leave policies, WFH rules, payroll, insurance, and more. What do you need?",
  },
  {
    patterns: [/\b(help|what.?can.?you|capabilities)\b/i],
    response: "I can answer questions about leave, WFH, salary, insurance, performance reviews, and recruitment. Just ask!",
  },
];

export function smartLocalReply(userMessage) {
  const text = userMessage.trim();
  for (const rule of RULES) {
    if (rule.patterns.some(p => p.test(text))) return rule.response;
  }
  return "I'm not sure about that. Try asking about leave policies, WFH rules, payroll, or insurance — or check the Policy Hub tab.";
}

export async function streamFallbackReply(userMessage, res) {
  const reply = smartLocalReply(userMessage);
  const words = reply.split(" ");
  let fullText = "";
  for (const word of words) {
    const token = fullText ? " " + word : word;
    fullText += token;
    res.write(`data: ${JSON.stringify({ token })}\n\n`);
    await new Promise(r => setTimeout(r, 35));
  }
  res.write(`data: ${JSON.stringify({ done: true, full: fullText, engine: "local" })}\n\n`);
  return fullText;
}
