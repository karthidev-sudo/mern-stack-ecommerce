import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

export const protectRoute = async (req, res, next) => {
    try {
        const accessToken = req.cookies.accessToken;

        if (!accessToken) {
            return res.status(401).json({ message: "UNAUTHORIZED - NO ACCESS TOKEN PROVIDED" });
        }

        try {
            const decoded = jwt.verify(accessToken, process.env.ACCESSTOKEN_TOKEN_SECRET);
            const user = await User.findById(decoded.userId).select("-password");

            if (!user) {
                return res.status(401).json({ message: "NO USER FOUND!" });
            }

            req.user = user;

            next();
        } catch (error) {
            if(error.name == "TokenExpiredError"){
                return res.status(401).json({message : "UNAUTHORIZED - ACCESS TOKEN EXPIRED"})
            }
            throw error
        }

    } catch (error) {
        console.log("ERROR IN PRODUCTROUTE MIDDLEWARE", error.message);
        res.status(500).json({ message: "UNAUTHORIZED - INVALID ACCESS TOKEN", error: error.message });
    }
}

export const adminRoute = (req, res , next) => {
    if (req.user && req.user.role == "admin"){
        next()
    }
    else{
        return res.status(401).json({message : "DENIED - ADMIN ONLY"});
    }
}