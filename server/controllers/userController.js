const User = require("../models/User");

// 전체 유저 조회
const getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select("-password");
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    next(error);
  }
};

// 특정 유저 조회
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      const error = new Error("유저를 찾을 수 없습니다.");
      error.statusCode = 404;
      throw error;
    }
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// 유저 생성
const createUser = async (req, res, next) => {
  try {
    const { email, name, password, userType, address } = req.body;

    if (!email || !name || !password) {
      const error = new Error("이메일, 이름, 비밀번호는 필수 항목입니다.");
      error.statusCode = 400;
      throw error;
    }

    if (password.length < 6) {
      const error = new Error("비밀번호는 최소 6자 이상이어야 합니다.");
      error.statusCode = 400;
      throw error;
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      const error = new Error("이미 등록된 이메일입니다.");
      error.statusCode = 409;
      throw error;
    }

    const user = await User.create({ email, name, password, userType, address });

    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({ success: true, data: userResponse });
  } catch (error) {
    if (error.code === 11000) {
      error.message = "이미 등록된 이메일입니다.";
      error.statusCode = 409;
    }
    next(error);
  }
};

// 유저 수정
const updateUser = async (req, res, next) => {
  try {
    const { email, name, password, userType, address } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { email, name, password, userType, address },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      const error = new Error("유저를 찾을 수 없습니다.");
      error.statusCode = 404;
      throw error;
    }
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// 유저 삭제
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      const error = new Error("유저를 찾을 수 없습니다.");
      error.statusCode = 404;
      throw error;
    }
    res.json({ success: true, message: "유저가 삭제되었습니다." });
  } catch (error) {
    next(error);
  }
};

module.exports = { getUsers, getUserById, createUser, updateUser, deleteUser };