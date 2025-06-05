import express from "express";
import Subscription from "../../models/subscription.js";
import nodemailer from "nodemailer";

const router = express.Router();

router.post("/", async (req, res) => {
  const { email } = req.body;

  if (!email || !email.includes("@")) {
    return res.status(400).json({ message: "Email không hợp lệ" });
  }

  try {
    const existing = await Subscription.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "Email đã được đăng ký" });
    }

    await Subscription.create({ email });

    // Gửi email xác nhận
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Cocoon" <${process.env.EMAIL_USERNAME}>`,
      to: email,
      subject: "Cảm ơn bạn đã đăng ký nhận thông tin",
      html: `
        <p>Chào bạn,</p>
        <p>Cảm ơn bạn đã đăng ký nhận thông tin từ chúng tôi.</p>
        <p>Hẹn gặp lại bạn trong các email sắp tới!</p>
        <br/>
        <p>Thân mến,<br/>Đội ngũ Cocoon</p>
      `,
    });

    res.status(200).json({ message: "Đăng ký thành công và email xác nhận đã được gửi" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
});

export default router;
