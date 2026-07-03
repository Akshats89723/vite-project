import PDFDocument from "pdfkit";

/**
 * Generates a clean, modern invoice PDF in memory and returns a Buffer.
 * @param {Object} data
 * @param {string} data.orgName - Name of the organization
 * @param {string} data.plan - 'pro' | 'enterprise'
 * @param {number} data.amount - Amount paid (e.g., 29 or 99)
 * @param {string} data.invoiceId - Unique invoice/subscription ID
 * @param {string} data.email - Admin user email
 * @param {string} [data.paymentMethod] - Stripe, Razorpay, etc.
 * @returns {Promise<Buffer>}
 */
export function generateInvoicePdf(data) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];

      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => {
        resolve(Buffer.concat(buffers));
      });

      // Colors
      const primaryColor = "#4F46E5"; // Indigo 600
      const textColor = "#1F2937";    // Gray 800
      const lightGray = "#F3F4F6";    // Gray 100
      const mutedText = "#6B7280";    // Gray 500

      // Header Banner
      doc.rect(0, 0, doc.page.width, 15).fill(primaryColor);

      // Logo/Company Name
      doc.fillColor(primaryColor)
         .fontSize(24)
         .font("Helvetica-Bold")
         .text("PeopleCore", 50, 45);

      doc.fillColor(mutedText)
         .fontSize(10)
         .font("Helvetica")
         .text("Virtual HR Suite", 50, 72);

      // Invoice Title
      doc.fillColor(textColor)
         .fontSize(20)
         .font("Helvetica-Bold")
         .text("INVOICE", 400, 45, { align: "right" });

      doc.fontSize(10)
         .font("Helvetica")
         .fillColor(mutedText)
         .text(`Invoice ID: ${data.invoiceId}`, 400, 70, { align: "right" })
         .text(`Date: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, 400, 85, { align: "right" });

      doc.moveDown(2);

      // Divider Line
      doc.strokeColor(lightGray).lineWidth(1).moveTo(50, 115).lineTo(550, 115).stroke();

      // Bill To Details
      doc.fillColor(textColor)
         .fontSize(12)
         .font("Helvetica-Bold")
         .text("Bill To:", 50, 135);

      doc.fontSize(10)
         .font("Helvetica")
         .fillColor(textColor)
         .text(data.orgName, 50, 155)
         .text(data.email, 50, 170);

      // Payment Method Section
      doc.fillColor(textColor)
         .fontSize(12)
         .font("Helvetica-Bold")
         .text("Payment Method:", 350, 135);

      doc.fontSize(10)
         .font("Helvetica")
         .fillColor(textColor)
         .text(data.paymentMethod || "Online Card Payment", 350, 155)
         .text("Status: Paid", 350, 170);

      doc.moveDown(3);

      // Table Header
      const tableTop = 220;
      doc.rect(50, tableTop, 500, 25).fill(lightGray);

      doc.fillColor(textColor)
         .fontSize(10)
         .font("Helvetica-Bold")
         .text("Description", 60, tableTop + 7)
         .text("Qty", 350, tableTop + 7, { width: 50, align: "right" })
         .text("Unit Price", 400, tableTop + 7, { width: 70, align: "right" })
         .text("Amount", 480, tableTop + 7, { width: 60, align: "right" });

      // Table Row
      const rowTop = tableTop + 30;
      doc.font("Helvetica")
         .fillColor(textColor)
         .text(`PeopleCore SaaS Subscription - ${data.plan.toUpperCase()} Plan`, 60, rowTop + 7)
         .text("1", 350, rowTop + 7, { width: 50, align: "right" })
         .text(`$${data.amount}`, 400, rowTop + 7, { width: 70, align: "right" })
         .text(`$${data.amount}`, 480, rowTop + 7, { width: 60, align: "right" });

      // Divider Line below row
      doc.strokeColor(lightGray).lineWidth(1).moveTo(50, rowTop + 25).lineTo(550, rowTop + 25).stroke();

      // Total Section
      const totalTop = rowTop + 45;
      doc.fontSize(11)
         .font("Helvetica-Bold")
         .fillColor(textColor)
         .text("Total Paid:", 380, totalTop)
         .fillColor(primaryColor)
         .text(`$${data.amount}`, 480, totalTop, { width: 60, align: "right" });

      // Footer
      doc.fontSize(9)
         .font("Helvetica")
         .fillColor(mutedText)
         .text("If you have any questions about this invoice, please contact support@peoplecore.com.", 50, 500, { align: "center", width: 500 })
         .text("Thank you for choosing PeopleCore!", 50, 520, { align: "center", width: 500 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
