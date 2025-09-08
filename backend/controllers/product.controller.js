import { redis } from "../lib/redis.js";
import cloudinary from "../lib/cloudinary.js";
import Product from "../models/product.model.js";

export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find({}); //FIND ALL PRODUCTS
    res.json({ products });
  } catch (error) {
    console.log("ERROR IN getAllProducts controller", error.message);
    res.status(500).json({ message: "SERVER ERROR", error: error.message });
  }
};

export const getFeaturedProducts = async (req, res) => {
  try {
    let featuredProducts = await redis.get("featured_product");
    if (featuredProducts) {
      return res.json(JSON.parse(featuredProducts));
    }

    // if not in redis, we fetch it from nmangodB
    featuredProducts = await Product.find({ isFeatured: true }).lean();

    if (!featuredProducts) {
      return res.status(401).json({ message: "NO FEATURED PRODUCTS FOUND" });
    }

    // STORE IN REDIS FOR FUTURE QUICK ACCESS

    await redis.set("featured_products", JSON.stringify(featuredProducts));

    res.json(featuredProducts);
  } catch (error) {
    console.log("ERROR IN getFeaturedProducts controller", error.message);
    res.status(500).json({ message: "SERVER ERROR", error: error.message });
  }
};

export const createProduct = async (req, res) => {
  try {
    const { name, description, price, image, category } = req.body;

    let cloudinaryResponse = null;

    if (image) {
      cloudinaryResponse = await cloudinary.uploader.upload(image, {
        folder: "products",
      });
    }

    const product = await Product.create({
      name,
      description,
      price,
      image: cloudinaryResponse?.secure_url
        ? cloudinaryResponse.secure_url
        : "",
      category,
    });

    res.status(201).json(product);
  } catch (error) {
    console.log("ERROR IN createProduct controller", error.message);
    return res
      .status(500)
      .json({ message: "SERVER ERROR", error: error.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(401).json({ message: "PRODUCT NOT FOUND" });
    }
    if (product.image) {
      const publicId = product.image.split("/").pop().split(".")[0]; //will get id of the image
      try {
        await cloudinary.uploader.destroy(`products/${publicId}`);
        console.log("DELETED THE IMAGE FROM CLOUDINARY");
      } catch (error) {}

      await Product.findByIdAndDelete(req.params.id);
      res.json({ message: "PRODUCT DELETED SUCCESSFULLY " });
    }
  } catch (error) {
    console.log("ERROR IN deleteProduct controller", error.message);
    res.status(500).json({ message: "SERVER ERROR", error: error.message });
  }
};

export const getRecommendedProducts = async (req, res) => {
  try {
    const products = await Product.aggregate([
      {
        $sample: { size: 4 },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          description: 1,
          image: 1,
          price: 1,
        },
      },
    ]);

    res.json(products);
  } catch (error) {
    console.log("ERROR IN getRecommendedProducts controller", error.message);
    res.status(500).json({ message: "SERVER ERROR", error: error.message });
  }
};

export const getProductsByCategory = async (req, res) => {
  const { category } = req.params;
  try {
    const products = await Product.find({ category });
    res.json({ products });
  } catch (error) {
    console.log("ERROR IN getProductsByCategory controller", error.message);
    res.status(500).json({ message: "SERVER ERROR", error: error.message });
  }
};

export const toggleFeaturedProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      product.isFeatured = !product.isFeatured;
      const updatedProduct = await product.save();
      await updateFeaturedProductsCache();
      res.json(updatedProduct);
    } else {
      res.status(404).json({ message: "PRODUCT NOT FOUND" });
    }
  } catch (error) {
    console.log("ERROR IN toggleFeaturedProduct controller", error.message);
    res.status(500).json({ message: "SERVER ERROR", error: error.message });
  }
};

async function updateFeaturedProductsCache() {
  try {
    const featuredProducts = await Product.find({ isFeatured: true }).lean();
    await redis.set("featured_products", JSON.stringify(featuredProducts));
  } catch (error) {
    console.log("ERROR IN UPDATE CACHE FUNCTION");
  }
}
