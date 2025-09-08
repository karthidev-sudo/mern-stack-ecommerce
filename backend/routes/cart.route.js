import express from "express";
import { addToCart, getCartProducts, removeAllFromCart, updateQuantity, clearCart } from "../controllers/cart.contoller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/",protectRoute, getCartProducts);
router.post("/",protectRoute, addToCart);
router.delete("/",protectRoute, removeAllFromCart);
router.put("/:id",protectRoute, updateQuantity);
router.delete("/clear", protectRoute, clearCart);


export default router