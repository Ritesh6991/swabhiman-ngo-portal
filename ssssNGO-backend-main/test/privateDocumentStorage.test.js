const assert = require("node:assert/strict");
const { Writable } = require("node:stream");
const test = require("node:test");

process.env.CLOUDINARY_NAME ||= "test-cloud";
process.env.CLOUDINARY_KEY ||= "test-key";
process.env.CLOUDINARY_SECRET ||= "test-secret";

const { createPrivateDocumentStorage } = require("../src/services/privateDocumentStorage");
const MembershipRequest = require("../src/models/MembershipRequest");
const User = require("../src/models/User");
const PaymentTransaction = require("../src/models/PaymentTransaction");

test("private document storage uploads with authenticated delivery and retrieves through a signed URL", async () => {
  let uploadOptions;
  const fakeClient = {
    uploader: {
      upload_stream: (options, callback) => {
        uploadOptions = options;
        const chunks = [];
        return new Writable({
          write(chunk, _encoding, done) { chunks.push(chunk); done(); },
          final(done) {
            callback(null, {
              asset_id: "asset-1",
              public_id: `${options.folder}/${options.public_id}`,
              format: "pdf",
              resource_type: "image",
              bytes: Buffer.concat(chunks).length,
            });
            done();
          },
        });
      },
      destroy: async () => ({ result: "ok" }),
    },
    utils: {
      private_download_url: (publicId, format, options) => `https://private.example/${publicId}.${format}?type=${options.type}`,
    },
  };
  const fetchCalls = [];
  const storage = createPrivateDocumentStorage(fakeClient, async (url) => {
    fetchCalls.push(url);
    return new Response(Buffer.from("private-pdf"), { status: 200, headers: { "content-type": "application/pdf" } });
  });

  const stored = await storage.uploadBuffer(Buffer.from("private-pdf"), {
    folder: "swabhiman/private/test",
    originalName: "receipt.pdf",
    mimeType: "application/pdf",
  });
  assert.equal(uploadOptions.type, "authenticated");
  assert.equal(uploadOptions.overwrite, false);
  assert.equal(stored.deliveryType, "authenticated");
  assert.equal(stored.mimeType, "application/pdf");
  assert.equal((await storage.download(stored)).toString(), "private-pdf");
  assert.match(fetchCalls[0], /type=authenticated/);
});

test("membership and receipt schemas keep durable documents without removing legacy path history", () => {
  assert.ok(MembershipRequest.schema.path("photoFile"));
  assert.ok(MembershipRequest.schema.path("photoDocument"));
  assert.ok(MembershipRequest.schema.path("idCardPath"));
  assert.ok(MembershipRequest.schema.path("idCardDocument"));
  assert.ok(MembershipRequest.schema.path("certificateDocument"));
  assert.ok(User.schema.path("idCardPath"));
  assert.ok(User.schema.path("idCardDocument"));
  assert.ok(PaymentTransaction.schema.path("receiptPath"));
  assert.ok(PaymentTransaction.schema.path("receiptDocument"));
});
