import mongoose from "mongoose";
import Product from "../../models/product.model.js";
import Category from "../../models/category.model.js";
import { ok, notFound, error } from "../../handlers/respone.handler.js";
import { decryptData, encryptData } from "../../utils/security.js";

export const getNewestProducts = async (req, res) => {
  try {
    const newestProducts = await Product.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select(
        "product_name category_id product_imgs product_rating product_variants product_sold_quantity product_slug"
      )
      .populate({
        path: "category_id",
        select: "category_name", // Lấy tên danh mục
      });

    const transformedProducts = newestProducts.map((product) => {
      const lowestPriceVariant = product.product_variants.reduce((minPriceVariant, variant) => {
        const discountedPrice =
          (variant.variant_price * (100 - variant.variant_discount_percent)) / 100;
        if (!minPriceVariant || discountedPrice < minPriceVariant.discountedPrice) {
          minPriceVariant = {
            ...variant,
            discountedPrice,
            variantPrice: variant.variant_price,
          };
        }
        return minPriceVariant;
      }, null);

      const highestDiscountVariant = product.product_variants
        ? product.product_variants.reduce((maxDiscountVariant, variant) => {
            if (
              !maxDiscountVariant ||
              variant.variant_discount_percent > maxDiscountVariant.variant_discount_percent
            ) {
              maxDiscountVariant = variant;
            }
            return maxDiscountVariant;
          }, null)
        : null;
      const variantNames = product.product_variants.map((variant) => variant.variant_name);

      return {
        product_id_hashed: encryptData(product._id.toString()),
        product_name: product.product_name,
        product_slug: product.product_slug,
        product_avg_rating: product.product_rating,
        product_img: product.product_imgs[0],
        lowest_price: lowestPriceVariant ? lowestPriceVariant.discountedPrice : null,
        product_price: lowestPriceVariant ? lowestPriceVariant.variantPrice : null,
        highest_discount: highestDiscountVariant
          ? highestDiscountVariant.variant_discount_percent
          : null,
        product_sold_quantity: product.product_sold_quantity,
        category_name: product.category_id?.category_name || "Unknown", // Lấy tên danh mục
        variant_names: variantNames,
      };
    });

    ok(res, transformedProducts, "Trả dữ liệu thành công");
  } catch (error) {
    console.error("Error in getNewestProducts:", error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy sản phẩm mới nhất.",
    });
  }
};

export const getTopRatedProducts = async (req, res) => {
  try {
    const topRatedProducts = await Product.find()
      .sort({ product_rating: -1, product_sold_quantity: -1 })
      .limit(10)
      .select(
        "product_name category_id product_imgs product_rating product_variants product_sold_quantity product_slug"
      )
      .populate({
        path: "category_id",
        select: "category_name",
      });

    const transformedProducts = topRatedProducts.map((product) => {
      const lowestPriceVariant = product.product_variants.reduce((minPriceVariant, variant) => {
        const discountedPrice =
          (variant.variant_price * (100 - variant.variant_discount_percent)) / 100;
        if (!minPriceVariant || discountedPrice < minPriceVariant.discountedPrice) {
          minPriceVariant = { ...variant, discountedPrice };
        }
        return minPriceVariant;
      }, null);

      const highestDiscountVariant = product.product_variants
        ? product.product_variants.reduce((maxDiscountVariant, variant) => {
            if (
              !maxDiscountVariant ||
              variant.variant_discount_percent > maxDiscountVariant.variant_discount_percent
            ) {
              maxDiscountVariant = variant;
            }
            return maxDiscountVariant;
          }, null)
        : null;

      const variantNames = product.product_variants.map((variant) => variant.variant_name);

      return {
        product_id_hashed: encryptData(product._id.toString()),
        product_name: product.product_name,
        product_slug: product.product_slug,
        product_avg_rating: product.product_rating,
        product_img: product.product_imgs[0],
        lowest_price: lowestPriceVariant ? lowestPriceVariant.discountedPrice : null,
        product_price: lowestPriceVariant ? lowestPriceVariant.variantPrice : null,
        highest_discount: highestDiscountVariant
          ? highestDiscountVariant.variant_discount_percent
          : null,
        product_sold_quantity: product.product_sold_quantity,
        category_name: product.category_id?.category_name || "Unknown",
        variant_names: variantNames,
      };
    });

    ok(res, transformedProducts, "Trả dữ liệu thành công");
  } catch (error) {
    console.error("Error in getTopRatedProducts:", error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy sản phẩm đánh giá cao nhất.",
    });
  }
};

export const getDiscountProducts = async (req, res) => {
  try {
    const discountProducts = await Product.find({
      product_variants: {
        $elemMatch: { variant_discount_percent: { $gt: 0 } },
      },
    })
      .sort({ product_rating: -1 })
      .limit(10)
      .select(
        "product_name category_id product_imgs product_rating product_variants product_sold_quantity product_slug"
      )
      .populate({
        path: "category_id",
        select: "category_name", // Lấy tên danh mục
      });

    const transformedProducts = discountProducts.map((product) => {
      const lowestPriceVariant = product.product_variants.reduce((minPriceVariant, variant) => {
        const discountedPrice =
          (variant.variant_price * (100 - variant.variant_discount_percent)) / 100;
        if (!minPriceVariant || discountedPrice < minPriceVariant.discountedPrice) {
          minPriceVariant = {
            ...variant,
            discountedPrice,
            variantPrice: variant.variant_price,
          };
        }
        return minPriceVariant;
      }, null);

      const highestDiscountVariant = product.product_variants
        ? product.product_variants.reduce((maxDiscountVariant, variant) => {
            if (
              !maxDiscountVariant ||
              variant.variant_discount_percent > maxDiscountVariant.variant_discount_percent
            ) {
              maxDiscountVariant = variant;
            }
            return maxDiscountVariant;
          }, null)
        : null;

      const variantNames = product.product_variants.map((variant) => variant.variant_name);

      return {
        product_id_hashed: encryptData(product._id.toString()),
        product_name: product.product_name,
        product_slug: product.product_slug,
        product_avg_rating: product.product_rating,
        product_img: product.product_imgs[0],
        lowest_price: lowestPriceVariant ? lowestPriceVariant.discountedPrice : null,
        product_price: lowestPriceVariant ? lowestPriceVariant.variantPrice : null,
        highest_discount: highestDiscountVariant
          ? highestDiscountVariant.variant_discount_percent
          : null,
        product_sold_quantity: product.product_sold_quantity,
        category_name: product.category_id?.category_name || "Unknown",
        variant_names: variantNames,
      };
    });

    ok(res, transformedProducts, "Trả dữ liệu thành công");
  } catch (error) {
    console.error("Error in getDiscountProducts:", error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy sản phẩm giảm giá.",
    });
  }
};

export const getSearchRecommended = async (req, res) => {
  try {
    const { searchKey } = req.query;

    const searchConditions = searchKey
      ? {
          $or: [
            { product_name: { $regex: searchKey, $options: "i" } },
            { product_slug: { $regex: searchKey.replace(/\s+/g, "-"), $options: "i" } },
            { "category_id.name": { $regex: searchKey, $options: "i" } },
          ],
        }
      : {};

    const products = await Product.find(searchConditions)
      .limit(4)
      .select(
        "product_name product_description category_id product_imgs product_rating product_variants product_sold_quantity product_slug"
      )
      .populate({
        path: "category_id",
        select: "category_name", // Lấy tên danh mục
      });

    const transformedProducts = products.map((product) => {
      const lowestPriceVariant = product.product_variants.reduce((minPriceVariant, variant) => {
        const discountedPrice =
          (variant.variant_price * (100 - variant.variant_discount_percent)) / 100;
        if (!minPriceVariant || discountedPrice < minPriceVariant.discountedPrice) {
          minPriceVariant = { ...variant, discountedPrice };
        }
        return minPriceVariant;
      }, null);

      const variantNames = product.product_variants.map((variant) => variant.variant_name);

      return {
        product_id_hashed: encryptData(product._id.toString()),
        product_name: product.product_name,
        product_slug: product.product_slug,
        product_img: product.product_imgs[0],
        product_price: lowestPriceVariant ? lowestPriceVariant.variantPrice : null,
        lowest_price: lowestPriceVariant?.discountedPrice || null,
        highest_discount: lowestPriceVariant?.variant_discount_percent || null,
        variant_names: variantNames,
      };
    });

    ok(res, { searchKey, recommendedProducts: transformedProducts }, "Trả dữ liệu thành công");
  } catch (error) {
    console.error("Error in getSearchRecommended:", error);
    res.status(500).json({ success: false, message: "Đã xảy ra lỗi khi tìm kiếm sản phẩm." });
  }
};

// Controller tìm kiếm + bộ lọc kết quả tìm kiếm
export const getSearchResult = async (req, res) => {
  try {
    let { searchKey, category, rating, minPrice, maxPrice, sortBy, discount, page } = req.query;

    // Chuyển đổi các giá trị từ query
    minPrice = minPrice ? parseInt(minPrice) : undefined;
    maxPrice = maxPrice ? parseInt(maxPrice) : undefined;
    page = page ? parseInt(page) : 1;
    discount = discount === "true";

    const perPage = 12;
    const pageNumber = page;

    let searchConditions = {};

    // Tìm kiếm theo từ khóa
    if (searchKey) {
      searchKey = searchKey.replace(/\s+/g, "(^\\s.+)|");
      const searchKeySlug = searchKey.replace(/\s+/g, "-");

      searchConditions.$or = [
        { product_name: { $regex: searchKey, $options: "i" } },
        { product_slug: { $regex: searchKeySlug, $options: "i" } },
        { "category_id.name": { $regex: searchKey, $options: "i" } },
        { product_description: { $regex: searchKey, $options: "i" } },
        { "product_variants.variant_name": { $regex: searchKey, $options: "i" } },
      ];
    }

    // Lọc theo danh mục (hỗ trợ nhiều danh mục)
    if (category) {
      const categoryNames = category.split(",");
      const categories = await Category.find({ category_name: { $in: categoryNames } }).select(
        "_id"
      );
      const categoryIds = categories.map((cat) => cat._id);
      searchConditions["category_id"] = { $in: categoryIds };
    }

    // Lọc theo xếp hạng (áp dụng nguyên tắc làm tròn rating)
    if (rating) {
      const ratings = rating.split(",").map((r) => parseInt(r, 10)); // Chuyển đổi về số nguyên
      searchConditions["$or"] = ratings.map((r) => ({
        "product_rating.rating_point": { $gte: r - 0.5, $lt: r + 0.5 },
      }));
    }

    // Lọc theo giá
    if (minPrice !== undefined && maxPrice !== undefined) {
      searchConditions["product_variants.variant_price"] = { $gte: minPrice, $lte: maxPrice };
    }

    // Lọc theo giảm giá
    if (discount) {
      searchConditions["product_variants.variant_discount_percent"] = { $gt: 0 };
    }

    // Sắp xếp
    let sortOptions = {};

    if (sortBy === "recent") {
      sortOptions = { createdAt: -1 }; // Sắp xếp theo ngày tạo mới nhất
    } else if (sortBy === "low-to-high") {
      sortOptions = { "product_variants.variant_price": 1 }; // Giá thấp đến cao
    } else if (sortBy === "high-to-low") {
      sortOptions = { "product_variants.variant_price": -1 }; // Giá cao đến thấp
    } else if (sortBy === "best-rating") {
      sortOptions = { "product_rating.rating_point": -1 }; // Đánh giá cao
    }

    // Tính toán phân trang
    const totalProducts = await Product.countDocuments(searchConditions);
    const totalPages = Math.ceil(totalProducts / perPage);
    const skip = (pageNumber - 1) * perPage;

    // Truy vấn sản phẩm
    let products = await Product.find(searchConditions)
      .sort(sortOptions)
      .skip(skip)
      .limit(perPage)
      .select(
        "product_name product_slug product_imgs product_short_description product_description product_sold_quantity product_specifications category_id product_variants product_rating.rating_point product_rating.rating_count review_count"
      )
      .populate("category_id", "category_name");

    // Xử lý sản phẩm trả về
    const transformedProducts = products.map((product) => {
      if (!product._id) return null;

      const lowestPriceVariant = product.product_variants
        ? product.product_variants.reduce((minPriceVariant, variant) => {
            const discountedPrice =
              variant.variant_price * (1 - (variant.variant_discount_percent || 0) / 100);
            if (!minPriceVariant || discountedPrice < minPriceVariant.discountedPrice) {
              return { ...variant, discountedPrice, variantPrice: variant.variant_price };
            }
            return minPriceVariant;
          }, null)
        : null;

      const highestDiscountVariant = product.product_variants
        ? product.product_variants.reduce((maxDiscountVariant, variant) => {
            if (
              !maxDiscountVariant ||
              variant.variant_discount_percent > maxDiscountVariant.variant_discount_percent
            ) {
              return variant;
            }
            return maxDiscountVariant;
          }, null)
        : null;

      const variantNames = product.product_variants.map((variant) => variant.variant_name);

      return {
        product_id_hashed: encryptData(product._id.toString()),
        product_name: product.product_name,
        product_slug: product.product_slug,
        product_avg_rating: product.product_rating?.rating_point,
        product_img: product.product_imgs[0],
        lowest_price: lowestPriceVariant?.discountedPrice || null,
        product_price: lowestPriceVariant?.variantPrice || null,
        highest_discount: highestDiscountVariant?.variant_discount_percent || null,
        product_sold_quantity: product.product_sold_quantity,
        category_name: product.category_id?.category_name || null,
        variant_name: variantNames,
      };
    });

    res.status(200).json({
      success: true,
      data: transformedProducts.filter((p) => p !== null),
      pagination: {
        totalPages,
        currentPage: pageNumber,
        totalResults: totalProducts,
      },
    });
  } catch (error) {
    console.error("Error occurred:", error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi tìm kiếm sản phẩm.",
    });
  }
};

export const getOrderProducts = async (req, res) => {
  try {
    // Giải mã product_hashed_id từ request
    const orderProducts = req.body.map((item) => ({
      product_id: new mongoose.Types.ObjectId(decryptData(item.product_hashed_id)),
      variant_id: new mongoose.Types.ObjectId(item.variant_id),
      quantity: item.quantity,
    }));

    // Tìm tất cả sản phẩm có product_id trong danh sách gửi lên
    const products = await Product.find({
      _id: { $in: orderProducts.map((item) => item.product_id) },
    }).lean();

    // Lọc ra đúng biến thể theo variant_id
    const orderResponse = orderProducts
      .map((orderItem) => {
        const product = products.find((p) => p._id.equals(orderItem.product_id));

        if (!product) return null; // Nếu không tìm thấy sản phẩm, bỏ qua

        const variant = product.product_variants.find((v) => v._id.equals(orderItem.variant_id));

        if (!variant) return null; // Nếu không tìm thấy biến thể, bỏ qua

        return {
          product_name: product.product_name,
          product_slug: product.product_slug,
          product_hashed_id: encryptData(product._id.toString()),
          product_variant: {
            variant_name: variant.variant_name,
            variant_slug: variant.variant_slug,
            variant_img: variant.variant_img,
            variant_price: variant.variant_price,
            variant_stock_quantity: variant.variant_stock_quantity,
            variant_discount_percent: variant.variant_discount_percent,
            _id: variant._id,
          },
          quantity: orderItem.quantity,
        };
      })
      .filter(Boolean); // Lọc bỏ các giá trị null

    if (!orderResponse.length) return notFound(res, {});

    return ok(res, { products: orderResponse });
  } catch (err) {
    console.log("Error in getOrderProducts:", err);
    return error(res, { error: err.message });
  }
};

export const getProductsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const decryptedCategoryId = decryptData(categoryId);
    console.log("decryptedCategoryId", decryptedCategoryId);

    if (!mongoose.Types.ObjectId.isValid(decryptedCategoryId)) {
      return res.status(400).json({ success: false, message: "Invalid category ID." });
    }

    const products = await Product.find({
      category_id: new mongoose.Types.ObjectId(decryptedCategoryId),
    })
      .select(
        "product_name product_slug product_imgs product_rating product_variants product_sold_quantity"
      )
      .populate({
        path: "category_id",
        select: "category_name",
      });

    const transformedProducts = products.map((product) => {
      const lowestPriceVariant = product.product_variants.reduce((minPriceVariant, variant) => {
        const discountedPrice =
          (variant.variant_price * (100 - variant.variant_discount_percent)) / 100;
        if (!minPriceVariant || discountedPrice < minPriceVariant.discountedPrice) {
          minPriceVariant = {
            ...variant,
            discountedPrice,
            variantPrice: variant.variant_price,
          };
        }
        return minPriceVariant;
      }, null);

      const variantNames = product.product_variants.map((variant) => variant.variant_name);

      return {
        product_id_hashed: encryptData(product._id.toString()),
        product_name: product.product_name,
        product_slug: product.product_slug,
        product_avg_rating: product.product_rating,
        product_img: product.product_imgs[0],
        product_price: lowestPriceVariant ? lowestPriceVariant.variantPrice : null,
        lowest_price: lowestPriceVariant?.discountedPrice || null,
        highest_discount: lowestPriceVariant?.variant_discount_percent || null,
        product_sold_quantity: product.product_sold_quantity,
        category_name: product.category_id?.category_name || "Unknown",
        variant_names: variantNames,
      };
    });

    ok(res, transformedProducts, "Trả dữ liệu thành công");
  } catch (error) {
    console.error("Error in getProductsByCategory:", error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy sản phẩm theo danh mục.",
    });
  }
};

export const getProductsGroupedByCategory = async (req, res) => {
  try {
    const productsGrouped = await Product.aggregate([
      {
        $group: {
          _id: "$category_id", // Nhóm theo category_id
          productCount: { $sum: 1 }, // Đếm số lượng sản phẩm
        },
      },
      {
        $lookup: {
          from: "categories", // Tên collection chứa danh mục (categories)
          localField: "_id", // category_id từ sản phẩm
          foreignField: "_id", // _id từ danh mục
          as: "category", // Tên trường mới chứa thông tin danh mục
        },
      },
      {
        $unwind: "$category", // Giải phóng mảng danh mục thành object
      },
      {
        $project: {
          categoryId: "$_id", // Đặt lại tên cho _id là categoryId
          categoryName: "$category.category_name", // Lấy tên danh mục
          productCount: 1, // Số lượng sản phẩm
        },
      },
    ]);

    if (!productsGrouped.length) {
      return notFound(res, "Không có sản phẩm nào được tìm thấy.");
    }

    ok(res, productsGrouped, "Trả dữ liệu thành công");
  } catch (error) {
    console.error("Error in getProductsGroupedByCategory:", error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy sản phẩm theo nhóm danh mục.",
    });
  }
};

// [GET] /api/guest/product/byCategory
export const getCategoriesWithRandomProducts = async (req, res, next) => {
  try {
    // Lấy danh sách danh mục kèm theo hình ảnh
    const categories = await Category.find({}, "_id category_name category_img");

    if (!categories || categories.length === 0) {
      console.log("Không tìm thấy danh mục nào!");
      return error(res, "Không tìm thấy danh mục nào.");
    }

    // Lấy sản phẩm ngẫu nhiên cho mỗi danh mục
    const categoryWithProducts = await Promise.all(
      categories.map(async (category) => {
        try {
          // Chuyển ObjectId nếu cần
          const categoryId = mongoose.isValidObjectId(category._id)
            ? category._id
            : new mongoose.Types.ObjectId(category._id);

          // Truy vấn sản phẩm
          const products = await Product.aggregate([
            { $match: { category_id: categoryId } },
            { $sample: { size: Math.floor(Math.random() * 5) + 2 } }, // Lấy từ 2-4 sản phẩm
            {
              $project: {
                _id: 1,
                product_id_hashed: { $toString: "$_id" },
                product_name: 1,
                product_slug: 1,
                product_imgs: { $ifNull: [{ $arrayElemAt: ["$product_imgs", 0] }, ""] }, // Lấy ảnh đầu tiên
                product_avg_rating: 1,
                product_short_description: 1,
                product_sold_quantity: 1,
                highest_discount: {
                  $ifNull: [{ $max: "$product_variants.variant_discount_percent" }, 0],
                },
                product_variants: {
                  $map: {
                    input: "$product_variants",
                    as: "variant",
                    in: {
                      variant_name: "$$variant.variant_name",
                      variant_price: "$$variant.variant_price",
                      variant_discount_percent: "$$variant.variant_discount_percent",
                      discounted_price: {
                        $subtract: [
                          "$$variant.variant_price",
                          {
                            $multiply: [
                              "$$variant.variant_price",
                              { $divide: ["$$variant.variant_discount_percent", 100] },
                            ],
                          },
                        ],
                      },
                    },
                  },
                },
              },
            },
          ]);

          const processedProducts = products.map((product) => ({
            ...product,
            product_id_hashed: encryptData(product.product_id_hashed),
          }));

          return {
            category_name: category.category_name,
            category_img: category.category_img,
            products: processedProducts,
          };
        } catch (error) {
          console.error(`Lỗi khi xử lý danh mục ${category.category_name}:`, error);
          return {
            category_name: category.category_name,
            category_img: category.category_img,
            products: [],
          };
        }
      })
    );

    return ok(res, { categories: categoryWithProducts });
  } catch (err) {
    console.error("Lỗi khi lấy danh mục và sản phẩm:", err);
    return error(res, "Lỗi khi lấy danh mục và sản phẩm.");
  }
};
