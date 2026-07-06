import PDFDocument from "pdfkit";

/**
 * Generates a clean, modern PDF payslip in memory and returns a Buffer.
 * @param {Object} data
 * @param {string} data.orgName - Name of the organization
 * @param {string} data.employeeName - Name of the employee
 * @param {string} data.employeeId - Employee ID (e.g., EMP001)
 * @param {string} data.role - Role/designation
 * @param {string} data.department - Department name
 * @param {string} data.salary - Annual salary string (e.g., "$120,000")
 * @param {string} data.month - Payslip month (e.g., "June 2026")
 * @returns {Promise<Buffer>}
 */
export function generatePayslipPdf(data) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];

      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => {
        resolve(Buffer.concat(buffers));
      });

      // Parse salary string to numeric
      const annualNumeric = parseFloat(String(data.salary || "$0").replace(/[^0-9.]/g, "")) || 0;
      const monthlyGross = Math.round(annualNumeric / 12);

      // Calculations
      const basic = Math.round(monthlyGross * 0.50);
      const hra = Math.round(monthlyGross * 0.30);
      const specialAllowance = Math.round(monthlyGross * 0.20);
      const earningsTotal = basic + hra + specialAllowance;

      const pf = Math.round(basic * 0.12);
      const profTax = annualNumeric > 100000 ? 200 : annualNumeric > 50000 ? 150 : 100;
      const deductionsTotal = pf + profTax;

      const netPay = earningsTotal - deductionsTotal;

      // Formatting helper
      const fmt = (num) => "$" + num.toLocaleString("en-US");

      // Colors
      const primaryColor = "#7C3AED"; // Purple 600 (PeopleCore Brand Purple)
      const textColor = "#1F2937";    // Gray 800
      const lightGray = "#F9FAFB";    // Gray 50
      const borderGray = "#E5E7EB";   // Gray 200
      const mutedText = "#6B7280";    // Gray 500

      // Top colored banner
      doc.rect(0, 0, doc.page.width, 15).fill(primaryColor);

      // Title & Header info
      doc.fillColor(primaryColor)
         .fontSize(22)
         .font("Helvetica-Bold")
         .text("PeopleCore", 50, 45);

      doc.fillColor(mutedText)
         .fontSize(10)
         .font("Helvetica")
         .text("Virtual HRMS Suite", 50, 70);

      doc.fillColor(textColor)
         .fontSize(18)
         .font("Helvetica-Bold")
         .text("PAYSLIP RECEIPT", 400, 45, { align: "right" });

      doc.fontSize(10)
         .font("Helvetica")
         .fillColor(mutedText)
         .text(`Month: ${data.month}`, 400, 70, { align: "right" });

      // Divider Line
      doc.strokeColor(borderGray).lineWidth(1).moveTo(50, 95).lineTo(550, 95).stroke();

      // Organization & Employee Details Grid
      const gridTop = 115;
      doc.fillColor(textColor).fontSize(10);

      // Left Column
      doc.font("Helvetica-Bold").text("Employer details", 50, gridTop);
      doc.font("Helvetica").fillColor(textColor)
         .text(data.orgName, 50, gridTop + 18)
         .text("Human Resources Department", 50, gridTop + 32)
         .text("payroll@company.com", 50, gridTop + 46);

      // Right Column
      doc.fillColor(textColor).font("Helvetica-Bold").text("Employee details", 320, gridTop);
      doc.font("Helvetica")
         .text(`Name: ${data.employeeName}`, 320, gridTop + 18)
         .text(`ID: ${data.employeeId}`, 320, gridTop + 32)
         .text(`Designation: ${data.role}`, 320, gridTop + 46)
         .text(`Department: ${data.department || "General"}`, 320, gridTop + 60);

      // Divider Line
      doc.strokeColor(borderGray).lineWidth(1).moveTo(50, 205).lineTo(550, 205).stroke();

      // Earnings & Deductions Tables
      const tableTop = 225;
      const tableWidth = 240;

      // --- EARNINGS COLUMN ---
      doc.rect(50, tableTop, tableWidth, 22).fill(lightGray);
      doc.strokeColor(borderGray).rect(50, tableTop, tableWidth, 22).stroke();
      doc.fillColor(textColor).font("Helvetica-Bold").fontSize(9)
         .text("Earnings", 60, tableTop + 7)
         .text("Amount", 230, tableTop + 7, { align: "right" });

      // Basic Salary
      let row1 = tableTop + 22;
      doc.strokeColor(borderGray).rect(50, row1, tableWidth, 22).stroke();
      doc.font("Helvetica").fillColor(textColor)
         .text("Basic Salary", 60, row1 + 7)
         .text(fmt(basic), 230, row1 + 7, { align: "right" });

      // HRA
      let row2 = row1 + 22;
      doc.strokeColor(borderGray).rect(50, row2, tableWidth, 22).stroke();
      doc.text("House Rent Allowance (HRA)", 60, row2 + 7)
         .text(fmt(hra), 230, row2 + 7, { align: "right" });

      // Special Allowance
      let row3 = row2 + 22;
      doc.strokeColor(borderGray).rect(50, row3, tableWidth, 22).stroke();
      doc.text("Special Allowance", 60, row3 + 7)
         .text(fmt(specialAllowance), 230, row3 + 7, { align: "right" });

      // Earnings Total Row
      let row4 = row3 + 22;
      doc.rect(50, row4, tableWidth, 22).fill(lightGray);
      doc.strokeColor(borderGray).rect(50, row4, tableWidth, 22).stroke();
      doc.font("Helvetica-Bold").fillColor(textColor)
         .text("Gross Earnings", 60, row4 + 7)
         .text(fmt(earningsTotal), 230, row4 + 7, { align: "right" });


      // --- DEDUCTIONS COLUMN ---
      const dedColX = 310;
      doc.rect(dedColX, tableTop, tableWidth, 22).fill(lightGray);
      doc.strokeColor(borderGray).rect(dedColX, tableTop, tableWidth, 22).stroke();
      doc.fillColor(textColor).font("Helvetica-Bold").fontSize(9)
         .text("Deductions", dedColX + 10, tableTop + 7)
         .text("Amount", dedColX + 190, tableTop + 7, { align: "right" });

      // Provident Fund
      doc.strokeColor(borderGray).rect(dedColX, row1, tableWidth, 22).stroke();
      doc.font("Helvetica").fillColor(textColor)
         .text("Provident Fund (PF)", dedColX + 10, row1 + 7)
         .text(fmt(pf), dedColX + 190, row1 + 7, { align: "right" });

      // Professional Tax
      doc.strokeColor(borderGray).rect(dedColX, row2, tableWidth, 22).stroke();
      doc.text("Professional Tax (PT)", dedColX + 10, row2 + 7)
         .text(fmt(profTax), dedColX + 190, row2 + 7, { align: "right" });

      // Empty cell spacer to align tables
      doc.strokeColor(borderGray).rect(dedColX, row3, tableWidth, 22).stroke();

      // Deductions Total Row
      doc.rect(dedColX, row4, tableWidth, 22).fill(lightGray);
      doc.strokeColor(borderGray).rect(dedColX, row4, tableWidth, 22).stroke();
      doc.font("Helvetica-Bold").fillColor(textColor)
         .text("Total Deductions", dedColX + 10, row4 + 7)
         .text(fmt(deductionsTotal), dedColX + 190, row4 + 7, { align: "right" });

      // Net Pay Summary Banner
      const summaryTop = row4 + 40;
      doc.rect(50, summaryTop, 500, 45).fill(lightGray);
      doc.strokeColor(borderGray).rect(50, summaryTop, 500, 45).stroke();

      doc.fillColor(textColor)
         .fontSize(12)
         .font("Helvetica-Bold")
         .text("NET TAKE-HOME PAY:", 70, summaryTop + 16);

      doc.fillColor(primaryColor)
         .fontSize(18)
         .font("Helvetica-Bold")
         .text(fmt(netPay), 350, summaryTop + 13, { align: "right", width: 180 });

      // Signature/Verification Section
      const signTop = summaryTop + 75;
      doc.strokeColor(borderGray).lineWidth(1).moveTo(50, signTop).lineTo(550, signTop).stroke();

      doc.fillColor(mutedText)
         .fontSize(8)
         .font("Helvetica")
         .text("This document is a system-generated payslip copy and does not require a physical signature.", 50, signTop + 15, { align: "center", width: 500 })
         .text("For any disputes or tax computation questions, please contact the PeopleCore HR representative.", 50, signTop + 27, { align: "center", width: 500 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
