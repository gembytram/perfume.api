import Order from "../../models/order.model.js";
import { ok, error, notFound, badRequest } from "../../handlers/respone.handler.js";
import mongoose from "mongoose";

// [GET] /api/orders
export const getOrders = async (req, res) => {
  try {
    const user_id = req.user?.user_id; // Lấy user_id từ request
    if (!user_id) {
      return res.status(400).json({ success: false, message: "User ID is required." });
    }

    const {
      status,
      sort = "createdAt",
      order = "desc",
      page = 1,
      limit = 10,
      product_name = "",
      order_id = "",
      phone_number = "",
    } = req.query;

    // Kiểm tra và chuyển đổi user_id sang ObjectId
    if (!mongoose.Types.ObjectId.isValid(user_id)) {
      return res.status(400).json({ success: false, message: "Invalid User ID." });
    }

    let query = { user_id: new mongoose.Types.ObjectId(user_id) }; // Dùng 'new' để tạo ObjectId hợp lệ

    // Thêm bộ lọc theo trạng thái
    if (status) {
      query.order_status = status;
    }

    // Thêm bộ lọc theo order_id
    if (order_id) {
      query.$expr = {
        $regexMatch: {
          input: { $toString: "$_id" },
          regex: order_id,
          options: "i",
        },
      };
    }

    // Thêm bộ lọc theo số điện thoại
    if (phone_number) {
      query["order_buyer.phone_number"] = phone_number;
    }

    const sortObj = {};
    sortObj[sort] = order === "asc" ? 1 : -1;

    // Aggregation pipeline
    const orders = await Order.aggregate([
      { $match: query },
      // Unwind order_products để xử lý từng sản phẩm
      { $unwind: "$order_products" },
      // Lookup để lấy thông tin product
      {
        $lookup: {
          from: "products",
          let: {
            productId: { $toObjectId: "$order_products.product_id" },
            variantId: { $toObjectId: "$order_products.variant_id" },
          },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$productId"] },
              },
            },
            {
              $project: {
                _id: 1,
                product_name: 1,
                product_imgs: { $arrayElemAt: ["$product_imgs", 0] },
                variant: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$product_variants",
                        as: "v",
                        cond: { $eq: ["$$v._id", "$$variantId"] },
                      },
                    },
                    0,
                  ],
                },
              },
            },
          ],
          as: "product_info",
        },
      },
      // Lọc sản phẩm theo product_name
      ...(product_name
        ? [
            {
              $match: {
                "product_info.product_name": {
                  $regex: product_name,
                  $options: "i",
                },
              },
            },
          ]
        : []),
      // Thêm thông tin product vào order_products
      {
        $addFields: {
          "order_products.product_name": {
            $arrayElemAt: ["$product_info.product_name", 0],
          },
          "order_products.product_img": {
            $arrayElemAt: ["$product_info.product_imgs", 0],
          },
          "order_products.variant_name": {
            $arrayElemAt: ["$product_info.variant.variant_name", 0],
          },
          "order_products.variant_img": {
            $arrayElemAt: ["$product_info.variant.variant_img", 0],
          },
        },
      },
      // Gom nhóm lại
      {
        $group: {
          _id: "$_id",
          order_id: { $first: "$order_id" },
          user_id: { $first: "$user_id" },
          order_buyer: { $first: "$order_buyer" },
          order_note: { $first: "$order_note" },
          total_products_cost: { $first: "$total_products_cost" },
          shipping_cost: { $first: "$shipping_cost" },
          final_cost: { $first: "$final_cost" },
          order_status: { $first: "$order_status" },
          createdAt: { $first: "$createdAt" },
          order_products: {
            $push: {
              product_id: "$order_products.product_id",
              variant_id: "$order_products.variant_id",
              quantity: "$order_products.quantity",
              unit_price: "$order_products.unit_price",
              discount_percent: "$order_products.discount_percent",
              product_name: "$order_products.product_name",
              product_img: "$order_products.product_img",
              variant_name: "$order_products.variant_name",
              variant_img: "$order_products.variant_img",
            },
          },
        },
      },
      // Sort và phân trang
      { $sort: sortObj },
      { $skip: (parseInt(page) - 1) * parseInt(limit) },
      { $limit: parseInt(limit) },
    ]);

    // Đếm tổng số orders phù hợp với điều kiện filter
    const total = await Order.aggregate([
      { $match: query },
      { $unwind: "$order_products" },
      {
        $lookup: {
          from: "products",
          let: { productId: { $toObjectId: "$order_products.product_id" } },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$productId"] },
              },
            },
          ],
          as: "product_info",
        },
      },
      ...(product_name
        ? [
            {
              $match: {
                "product_info.product_name": {
                  $regex: product_name,
                  $options: "i",
                },
              },
            },
          ]
        : []),
      { $group: { _id: "$_id" } },
      { $count: "total" },
    ]);

    const totalCount = total.length > 0 ? total[0].total : 0;

    // Trả về dữ liệu
    return res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          total_pages: Math.ceil(totalCount / limit),
        },
      },
    });
  } catch (err) {
    console.error("Error in getOrders API:", err); // Log lỗi chi tiết
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// [GET] /api/orders/[:id]
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.user_id;

    // console.log("Request Params ID:", id);
    // console.log("User ID:", user_id);

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.error("Invalid order ID");
      return error(res, "Invalid order ID");
    }

    const orderId = new mongoose.Types.ObjectId(id);

    // Aggregation pipeline
    const order = await Order.aggregate([
      {
        $match: {
          _id: orderId,
          user_id: new mongoose.Types.ObjectId(user_id),
        },
      },
      {
        $unwind: "$order_products",
      },
      {
        $lookup: {
          from: "products",
          let: {
            productId: "$order_products.product_id",
            variantId: "$order_products.variant_id",
          },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$productId"] },
              },
            },
            {
              $project: {
                _id: 1,
                product_name: 1,
                product_imgs: { $arrayElemAt: ["$product_imgs", 0] },
                variant: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$product_variants",
                        as: "v",
                        cond: { $eq: ["$$v._id", "$$variantId"] },
                      },
                    },
                    0,
                  ],
                },
              },
            },
          ],
          as: "product_info",
        },
      },
      {
        $addFields: {
          "order_products.product_name": {
            $arrayElemAt: ["$product_info.product_name", 0],
          },
          "order_products.product_img": {
            $arrayElemAt: ["$product_info.product_imgs", 0],
          },
          "order_products.variant_name": {
            $arrayElemAt: ["$product_info.variant.variant_name", 0],
          },
          "order_products.variant_img": {
            $arrayElemAt: ["$product_info.variant.variant_img", 0],
          },
        },
      },
      {
        $group: {
          _id: "$_id",
          order_id: { $first: "$order_id" },
          user_id: { $first: "$user_id" },
          order_buyer: { $first: "$order_buyer" },
          order_note: { $first: "$order_note" },
          total_products_cost: { $first: "$total_products_cost" },
          shipping_cost: { $first: "$shipping_cost" },
          final_cost: { $first: "$final_cost" },
          order_status: { $first: "$order_status" },
          createdAt: { $first: "$createdAt" },
          updatedAt: { $first: "$updatedAt" },
          order_products: {
            $push: {
              product_id: "$order_products.product_id",
              variant_id: "$order_products.variant_id",
              quantity: "$order_products.quantity",
              unit_price: "$order_products.unit_price",
              discount_percent: "$order_products.discount_percent",
              product_name: "$order_products.product_name",
              product_img: "$order_products.product_img",
              variant_name: "$order_products.variant_name",
              variant_img: "$order_products.variant_img",
            },
          },
        },
      },
    ]);

    // Kiểm tra nếu không tìm thấy đơn hàng
    if (!order || order.length === 0) {
      console.error("Order not found with ID:", orderId);
      return notFound(res, "Order not found");
    }

    // Log kết quả
    // console.log("Order Found:", JSON.stringify(order[0], null, 2));

    // Trả về kết quả
    return ok(res, { order: order[0] });
  } catch (err) {
    console.error("Error fetching order:", err);
    if (err.name === "CastError") {
      return error(res, "Invalid order ID");
    }
    return error(res, "Internal server error");
  }
};

// [GET] /api/orders/track
export const trackOrder = async (req, res) => {
  try {
    const { order_id, phone_number } = req.query;

    // console.log("Order ID:", order_id);
    // console.log("Phone Number:", phone_number);

    // Kiểm tra đầu vào
    if (!order_id || !phone_number) {
      return res.status(400).json({ message: "Order ID và số điện thoại là bắt buộc" });
    }

    // Kiểm tra định dạng số điện thoại
    const phoneRegex = /^[0-9]{10,11}$/;
    if (!phoneRegex.test(phone_number)) {
      return res.status(400).json({ message: "Số điện thoại không hợp lệ" });
    }

    // Xây dựng biểu thức regex cho order_id
    const orderIdPattern = new RegExp(`^${order_id}\\..*`);

    const order = await Order.aggregate([
      {
        $match: {
          order_id: { $regex: orderIdPattern, $options: "i" }, // Khớp regex không phân biệt chữ hoa/thường
        },
      },
      {
        $unwind: "$order_products", // Phân rã order_products để xử lý từng sản phẩm
      },
      {
        $lookup: {
          from: "products",
          let: {
            productId: { $toObjectId: "$order_products.product_id" },
            variantId: { $toObjectId: "$order_products.variant_id" },
          },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$productId"] },
              },
            },
            {
              $project: {
                _id: 1,
                product_name: 1,
                product_imgs: { $arrayElemAt: ["$product_imgs", 0] },
                variant: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$product_variants",
                        as: "v",
                        cond: { $eq: ["$$v._id", "$$variantId"] },
                      },
                    },
                    0,
                  ],
                },
              },
            },
          ],
          as: "product_info",
        },
      },
      {
        $addFields: {
          "order_products.product_name": { $arrayElemAt: ["$product_info.product_name", 0] },
          "order_products.product_img": { $arrayElemAt: ["$product_info.product_imgs", 0] },
          "order_products.variant_name": {
            $arrayElemAt: ["$product_info.variant.variant_name", 0],
          },
          "order_products.variant_img": { $arrayElemAt: ["$product_info.variant.variant_img", 0] },
          "order_products.total_price": {
            $multiply: ["$order_products.unit_price", "$order_products.quantity"],
          },
        },
      },
      {
        $group: {
          _id: "$_id",
          order_buyer: { $first: "$order_buyer" },
          order_note: { $first: "$order_note" },
          total_products_cost: { $sum: "$order_products.total_price" },
          shipping_cost: { $first: "$shipping_cost" },
          final_cost: {
            $first: {
              $add: ["$shipping_cost", "$final_cost"],
            },
          },
          payment_method: { $first: "$payment_method" },
          applied_coupons: { $first: "$applied_coupons" },
          order_status: { $first: "$order_status" },
          createdAt: { $first: "$createdAt" },
          updatedAt: { $first: "$updatedAt" },
          order_products: {
            $push: {
              product_id: "$order_products.product_id",
              variant_id: "$order_products.variant_id",
              quantity: "$order_products.quantity",
              unit_price: "$order_products.unit_price",
              discount_percent: "$order_products.discount_percent",
              product_name: "$order_products.product_name",
              product_img: "$order_products.product_img",
              variant_name: "$order_products.variant_name",
              variant_img: "$order_products.variant_img",
              total_price: "$order_products.total_price",
            },
          },
        },
      },
    ]);
    // console.log("Response:", order);

    if (!order || order.length === 0) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    return res.status(200).json({ order: order[0] });
  } catch (err) {
    console.error("Lỗi khi tra cứu đơn hàng:", err);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

// [GET] /api/orders/getOrder/:orderId
export const getOrderByOrderId = async (req, res) => {
  try {
    const { orderId } = req.params;

    // console.log("Request Params orderId:", orderId);

    // Validate orderId
    if (!orderId || typeof orderId !== "string") {
      console.error("Invalid order ID format");
      return res.status(400).json({
        success: false,
        message: "Invalid order ID format",
      });
    }

    // Aggregation pipeline
    const order = await Order.aggregate([
      {
        $match: {
          order_id: orderId, // Chỉ dựa vào order_id để tìm kiếm
        },
      },
      {
        $unwind: "$order_products",
      },
      {
        $lookup: {
          from: "products",
          let: {
            productId: "$order_products.product_id",
            variantId: "$order_products.variant_id",
          },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$productId"] },
              },
            },
            {
              $project: {
                _id: 1,
                product_name: 1,
                product_imgs: { $arrayElemAt: ["$product_imgs", 0] },
                variant: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$product_variants",
                        as: "v",
                        cond: { $eq: ["$$v._id", "$$variantId"] },
                      },
                    },
                    0,
                  ],
                },
              },
            },
          ],
          as: "product_info",
        },
      },
      {
        $addFields: {
          "order_products.product_name": {
            $arrayElemAt: ["$product_info.product_name", 0],
          },
          "order_products.product_img": {
            $arrayElemAt: ["$product_info.product_imgs", 0],
          },
          "order_products.variant_name": {
            $arrayElemAt: ["$product_info.variant.variant_name", 0],
          },
          "order_products.variant_img": {
            $arrayElemAt: ["$product_info.variant.variant_img", 0],
          },
        },
      },
      {
        $group: {
          _id: "$_id",
          order_id: { $first: "$order_id" },
          user_id: { $first: "$user_id" },
          order_buyer: { $first: "$order_buyer" },
          order_note: { $first: "$order_note" },
          total_products_cost: { $first: "$total_products_cost" },
          shipping_cost: { $first: "$shipping_cost" },
          final_cost: { $first: "$final_cost" },
          order_status: { $first: "$order_status" },
          createdAt: { $first: "$createdAt" },
          updatedAt: { $first: "$updatedAt" },
          order_products: {
            $push: {
              product_id: "$order_products.product_id",
              variant_id: "$order_products.variant_id",
              quantity: "$order_products.quantity",
              unit_price: "$order_products.unit_price",
              discount_percent: "$order_products.discount_percent",
              product_name: "$order_products.product_name",
              product_img: "$order_products.product_img",
              variant_name: "$order_products.variant_name",
              variant_img: "$order_products.variant_img",
            },
          },
        },
      },
    ]);

    // Kiểm tra nếu không tìm thấy đơn hàng
    if (!order || order.length === 0) {
      console.error("Order not found with order_id:", orderId);
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Trả về kết quả
    return res.status(200).json({
      success: true,
      data: { order: order[0] },
    });
  } catch (err) {
    console.error("Error fetching order by order_id:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// [PUT] /api/orders/cancel/:id
export const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    console.log("Order ID from params:", orderId); // Kiểm tra giá trị của orderId

    if (!orderId) {
      return res.status(400).json({ success: false, message: "Order ID is required." });
    }

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ success: false, message: "Invalid order ID." });
    }

    const order = await Order.findOne({ _id: orderId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found or you don't have permission to update this order.",
      });
    }

    // Cập nhật trạng thái đơn hàng thành "Đã hủy"
    await Order.updateOne(
      { _id: orderId },
      { $set: { order_status: "cancel" } } // Cập nhật trạng thái thành "Đã hủy"
    );

    return res.status(200).json({ success: true, message: "Order status updated to 'canceled'." });
  } catch (err) {
    console.error("Error updating order status:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
