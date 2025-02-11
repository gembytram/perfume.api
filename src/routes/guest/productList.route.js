import express from "express";
import {
  getNewestProducts,
  getTopRatedProducts,
  getDiscountProducts,
  getSearchRecommended,
  getOrderProducts,
  getSearchResult,
  getProductsByCategory,
  getProductsGroupedByCategory,
  getCategoriesWithRandomProducts,
} from "../../controllers/guest/productList.controller.js";

const router = express.Router();

// Middleware để mã hóa searchKey và category
const encodeURI = (req, res, next) => {
  const searchKey = req.params.searchKey || "";
  const category = req.params.category || "";
  // Mã hóa searchKey và category để đảm bảo URL hợp lệ
  const encodedSearchKey = encodeURIComponent(searchKey);
  const encodedCategory = encodeURIComponent(category);
  req.encodedSearchKey = encodedSearchKey;
  req.encodedCategory = encodedCategory;
  next();
};

router.get("/getNewestProducts", getNewestProducts);
router.get("/getTopRatedProducts", getTopRatedProducts);
router.get("/getDiscountProducts", getDiscountProducts);
router.get("/searchRecommended", encodeURI, getSearchRecommended);
// Ví dụ: "/search?searchKey=Mèo&category=ABC&sort=ABC&minPrice=100000&maxPrice=500000&rating=4&discount=true&page=2
router.get("/search", encodeURI, getSearchResult);

router.get("/getProductsByCategory/:categoryId", getProductsByCategory);
router.post("/getOrderProducts", getOrderProducts);
router.get("/getProductsGroupedByCategory", getProductsGroupedByCategory);
router.get("/byCategory", getCategoriesWithRandomProducts);

export default router;
