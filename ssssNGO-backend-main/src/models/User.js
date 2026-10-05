const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: { type: String, trim: true, default: "" },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["user", "admin", "owner"],
      default: "user",
    },

    joined: {
      type: Boolean,
      default: false,
    },

    memberId: {
      type: String,
      default: null,
      index: true,
    },

    idCardPath: { type: String, default: "" },
    certificatePath: { type: String, default: "" },
    idCardDocument: { type: mongoose.Schema.Types.Mixed, default: null },
    certificateDocument: { type: mongoose.Schema.Types.Mixed, default: null },
    membershipActivatedAt: { type: Date, default: null },

    location: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: {
        type: [Number], // [lng, lat]
      },
    },
  },
  { timestamps: true }
);

userSchema.index({ location: "2dsphere" });
userSchema.set("toJSON", {
  transform: (_doc, result) => {
    delete result.password;
    return result;
  },
});

module.exports = mongoose.model("User", userSchema);
