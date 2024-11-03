import jwt from "jsonwebtoken";
import argon2 from "argon2";

import { ok, error, badRequest, unauthorize } from "../../handlers/respone.handler.js";
import { USER_ROLES } from "../../utils/constants/index.js";
import User from "../../models/user.model.js";
import { sendVerificationEmail } from "../../utils/functions/emailService.js";
import passport from '../../passport.js';

// [POST] /api/auth/register
export const register = async (req, res, next) => {
  try {
    const { email, password, user_name } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ user_email: email });
    if (existingUser) {
      return badRequest(res, "User already exists");
    }

    // Hash the password using argon2
    const hashedPassword = await argon2.hash(password);

    // Create a new user
    const newUser = new User({
      user_email: email,
      user_password: hashedPassword,
      user_role: USER_ROLES.USER,
      user_name: user_name,
      is_email_verified: false,
    });

    // Save the user to the database
    await newUser.save();

    // Create a verification token
    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: "10m",
    });

    // Create a verification link
    const verificationLink = `${process.env.BASE_URL}/api/auth/verify-email?token=${token}`;

    // Send verification email
    await sendVerificationEmail(email, verificationLink);

    return ok(res, { message: "User registered. Please check your email to verify your account." });
  } catch (err) {
    console.log("Err: " + err);
    return error(res, { message: "Internal server error" }, 500);
  }
};

// [GET] /api/auth/verify-email
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return badRequest(res, "Token is required");
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    // Find the user
    const user = await User.findById(userId);

    if (!user) {
      return error(res, "User not found", 404);
    }
    if (user.is_email_verified == true) {
      return badRequest(res, "Account has already verified");
    }

    // Update email verification status
    user.is_email_verified = true;
    await user.save();
    // return res.redirect("/login?message=Email verified successfully. Please log in.");
    return res.redirect(process.env.FE_URL + "/login");
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return res.redirect("/error?message=Verification link has expired&action=resend");
    }
    if (err instanceof jwt.JsonWebTokenError) {
      return badRequest(res, "Invalid token");
    }
    console.log("Err: " + err);
    return error(res, "Internal server error");
  }
};
// [GET] /api/auth/check-email
export const checkEmail = async (req, res) => {
  try {
    let { email } = req.query;

    if (!email) {
      return badRequest(res, "Email is required");
    }
    email = email.trim();

    const existingUser = await User.findOne({ user_email: email });

    if (existingUser) {
      return ok(res, { exists: true, message: "Email is already registered" });
    } else {
      return ok(res, { exists: false, message: "Email is available" });
    }
  } catch (err) {
    console.log("Err: " + err);
    return error(res, { message: "Internal server error" }, 500);
  }
};
// [POST] /api/auth/login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ user_email: email });
    // user not found hoặc là tài khoản gg or fb 
    if (!user || ( user.user_password == 'google-auth' || user.user_password == 'facebook-auth')) {
      return badRequest(res, "Invalid email or password");
    }

    // Kiểm tra password
    const isValidPassword = await argon2.verify(user.user_password, password);
    if (!isValidPassword) {
      return badRequest(res, "Invalid email or password");
    }
    // Kiểm tra xác thực tài khoản
    if (!user.is_email_verified) {
      return badRequest(res, "Please verify your email before logging in");
    }
    // Tạo JWT token
    const token = jwt.sign(
      {
        user_id: user._id,
        name: user.user_name,
        user_roles: user.user_role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Tạo refresh token
    const refreshToken = jwt.sign({ user_id: user._id }, process.env.REFRESH_TOKEN_SECRET, {
      expiresIn: "7d",
    });

    // Lưu refresh token vào database ( để quản lý và thu hồi)
    user.refresh_token = refreshToken;
    await user.save();

    return ok(res, {
      token,
      user: {
        id: user._id,
        name: user.user_name,
        email: user.user_email,
        role: user.user_role,
      },
      expiresIn: 3600, // 1 giờ
      refreshToken,
    });
  } catch (err) {
    console.log(err)
    return error(res, { message: "Internal server error" }, 500);
  }
};


// login with gg, fb

export const googleAuth = passport.authenticate('google', { scope: ['profile', 'email'] });

export const googleAuthCallback = (req, res, next) => {
  passport.authenticate('google', { session: false }, (err, data) => {
    if (err) {
      return next(err);
    }
    if (!data) {
      return badRequest(res, "Google authentication failed");
    }
    
    const { token, user } = data;

    // Redirect with token and name
    res.redirect(`${process.env.FE_URL}/?token=${token}`);

  })(req, res, next);
};
export const facebookAuth = passport.authenticate('facebook', { scope: ['email'] });

export const facebookAuthCallback = (req, res, next) => {
  passport.authenticate('facebook', { session: false }, (err, data) => {
    if (err) {
      return next(err);
    }
    if (!data) {
      res.redirect(`${process.env.FE_URL}/login`);
    }
    const { token, user } = data;
    // Redirect with token and name
    res.redirect(`${process.env.FE_URL}/?token=${token}`);

  })(req, res, next);
};

// [POST] /api/auth/refresh-token
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return badRequest(res, "Refresh token is required");
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    
    // Tìm user với refresh token này
    const user = await User.findOne({ 
      _id: decoded.user_id,
      refresh_token: refreshToken 
    });

    if (!user) {
      return unauthorize(res, "Invalid refresh token");
    }

    // Tạo access token mới
    const newAccessToken = jwt.sign(
      {
        user_id: user._id,
        name: user.user_name,
        user_roles: user.user_role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Tạo refresh token mới (optional)
    const newRefreshToken = jwt.sign(
      { user_id: user._id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    );

    // Cập nhật refresh token mới trong database
    user.refresh_token = newRefreshToken;
    await user.save();

    return ok(res, {
      token: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 3600, // 1 giờ
    });

  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return unauthorize(res, "Refresh token has expired");
    }
    if (err instanceof jwt.JsonWebTokenError) {
      return unauthorize(res, "Invalid refresh token");
    }
    console.log("Err: ", err);
    return error(res, { message: "Internal server error" }, 500);
  }
};

// [GET] /api/auth/me
export const getMe = async (req, res) => {
  try {
    // req.user đã được decode từ middleware verifyToken
    const user = await User.findById(req.user.user_id);
    
    if (!user) {
      return error(res, "User not found", 404);
    }

    return ok(res, {
      user: {
        id: user._id,
        name: user.user_name,
        email: user.user_email,
        role: user.user_role,
      },
      expiresIn: 3600, // 1 giờ
      refreshToken: user.refresh_token // Thêm refresh token vào response
    });

  } catch (err) {
    console.log("Err: ", err);
    return error(res, { message: "Internal server error" }, 500);
  }
};