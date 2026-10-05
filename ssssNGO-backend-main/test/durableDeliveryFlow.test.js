const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const setMock = (modulePath, exports) => {
  const resolved = require.resolve(modulePath);
  require.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports };
};

test("membership generation stores both PDFs privately and emails downloaded content", async () => {
  const temporary = [];
  const emails = [];
  const stored = new Map([["member-photo", Buffer.from([0xff, 0xd8, 0xff, 0x00])]]);
  const fakeStorage = {
    uploadGeneratedPdf: async (filePath, kind, filename) => {
      const document = { publicId: `private/${kind}/${filename}`, format: "pdf", resourceType: "image", deliveryType: "authenticated", mimeType: "application/pdf", originalName: filename };
      stored.set(document.publicId, await fs.promises.readFile(filePath));
      return document;
    },
    destroyDocuments: async () => [],
    downloadDocument: async (document) => stored.get(document.publicId),
  };
  const pdfGenerator = (label) => async () => {
    const filePath = path.join(os.tmpdir(), `swabhiman-${label}-${Date.now()}-${Math.random()}.pdf`);
    await fs.promises.writeFile(filePath, Buffer.from(`%PDF-${label}`));
    temporary.push(filePath);
    return filePath;
  };
  setMock("../src/services/membershipDocumentStorage", fakeStorage);
  setMock("../src/utils/generateIdCard", pdfGenerator("id-card"));
  setMock("../src/utils/generateCertificate", pdfGenerator("certificate"));
  setMock("../src/utils/sendMail", async (message) => { emails.push(message); return { id: "mail-1" }; });

  const DeliveryLog = require("../src/models/DeliveryLog");
  const originalFind = DeliveryLog.findOneAndUpdate;
  const delivery = { status: "pending", attempts: 0, save: async () => delivery };
  DeliveryLog.findOneAndUpdate = async () => delivery;
  delete require.cache[require.resolve("../src/services/membershipActivationService")];
  const { deliverMembershipDocuments } = require("../src/services/membershipActivationService");

  const request = {
    _id: "request-1", name: "QA Member", membershipType: "yearly", approvedAt: new Date(), validTill: new Date(),
    photoDocument: { publicId: "member-photo", format: "jpg", resourceType: "image", deliveryType: "authenticated" },
    save: async () => request,
  };
  const user = { _id: "user-1", email: "qa@example.invalid", memberId: "SVB-QA", save: async () => user };
  try {
    await deliverMembershipDocuments({ user, request });
    assert.equal(delivery.status, "sent");
    assert.equal(request.idCardDocument.deliveryType, "authenticated");
    assert.equal(request.certificateDocument.deliveryType, "authenticated");
    assert.equal(emails.length, 1);
    assert.equal(Buffer.isBuffer(emails[0].attachments[0].content), true);
    assert.equal(Buffer.isBuffer(emails[0].attachments[1].content), true);
    assert.equal(temporary.some(fs.existsSync), false);
  } finally {
    DeliveryLog.findOneAndUpdate = originalFind;
    await Promise.allSettled(temporary.map((item) => fs.promises.rm(item, { force: true })));
  }
});

test("donation receipt is uploaded privately before its email attachment is sent", async () => {
  const emails = [];
  const temporary = path.join(os.tmpdir(), `swabhiman-receipt-${Date.now()}.pdf`);
  setMock("../src/utils/generateDonationReceipt", async () => {
    await fs.promises.writeFile(temporary, Buffer.from("%PDF-receipt"));
    return temporary;
  });
  setMock("../src/services/privateDocumentStorage", {
    uploadFile: async (filePath, options) => ({
      publicId: "private/receipts/qa", format: "pdf", resourceType: "image", deliveryType: "authenticated",
      mimeType: options.mimeType, originalName: options.originalName,
    }),
    download: async () => Buffer.from("%PDF-receipt"),
  });
  setMock("../src/utils/sendMail", async (message) => { emails.push(message); return { id: "mail-2" }; });
  delete require.cache[require.resolve("../src/services/donationReceiptService")];
  const { deliverDonationReceipt } = require("../src/services/donationReceiptService");
  const transaction = {
    receiptNumber: "DON-QA", receiptPath: "", receiptDocument: null,
    receiptDeliveryStatus: "generated", receiptDeliveryAttempts: 0,
    donor: { email: "qa@example.invalid", name: "QA Donor" },
    save: async () => transaction,
  };
  try {
    await deliverDonationReceipt(transaction);
    assert.equal(transaction.receiptDocument.deliveryType, "authenticated");
    assert.equal(transaction.receiptDeliveryStatus, "sent");
    assert.equal(Buffer.isBuffer(emails[0].attachments[0].content), true);
    assert.equal(fs.existsSync(temporary), false);
  } finally {
    await fs.promises.rm(temporary, { force: true });
  }
});
