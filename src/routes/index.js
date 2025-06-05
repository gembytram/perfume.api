import adminRouter from "./admin/index.js";
import guestRouter from "./guest/index.js";
import customerRouter from "./customer/index.js";
import cloudinaryRouter from "./cloudinary/index.js";
import payosRouter from "./payos/index.js";
import authRouter from "./auth/index.js";
import orderRouter from "./order/order.route.js";
import passport from "../passport.js";
import userRouter from "./user/user.route.js";
import locationRouter from "./location/location.route.js";
import subscribeRoute from "./guest/subscription.js";

const route = (app) => {
  app.get("/", (req, res) => res.send("Express on Vercel"));
  app.use("/api/admin", adminRouter);
  app.use("/api/guest", guestRouter);
  app.use("/api/customer", customerRouter);
  app.use("/api/cloudinary", cloudinaryRouter);
  app.use("/api/payos", payosRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/orders", orderRouter);
  app.use("/api/user", userRouter);
  app.use("/api/locations", locationRouter);
  app.use("/api/subscribe", subscribeRoute);

  // init passport
  if (
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_CALLBACK_URL
  ) {
    app.use(passport.initialize());
  }
};

export default route;
