const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "이메일은 필수 항목입니다."],
      unique: true,
      trim: true,
      lowercase: true,
    },
    name: {
      type: String,
      required: [true, "이름은 필수 항목입니다."],
      trim: true,
    },
    password: {
      type: String,
      required: [true, "비밀번호는 필수 항목입니다."],
      minlength: [6, "비밀번호는 최소 6자 이상이어야 합니다."],
    },
    userType: {
      type: String,
      required: true,
      enum: ["customer", "admin"],
      default: "customer",
    },
    address: {
      type: String,
      default: "",
    },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);

module.exports = User;
