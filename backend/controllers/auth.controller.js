import { decodeBase64 } from "bcryptjs";
import { redis } from "../lib/redis.js";
import User from "../models/user.model.js";
import jwt, { decode } from "jsonwebtoken";

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.ACCESSTOKEN_TOKEN_SECRET, {
    expiresIn: "15m",
  })
  const refreshToken = jwt.sign({ userId }, process.env.REFRESHTOKEN_TOKEN_SECRET, {
    expiresIn: "7d",
  })

  return { accessToken, refreshToken };
};

const storeRefreshToken = async (userId, refreshToken) => {
  await redis.set(`refresh_token:${userId}`, refreshToken, "EX", 7 * 24 * 60 * 60);
}

const setCookies = (res, accessToken, refreshToken) => {
  res.cookie("accessToken", accessToken, {
    httpOnly: true, //prevent XSS attacks , cross-side scriptinf attacks
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict", //prevent CFRS attacks , cross-site request forgery
    maxAge: 15 * 60 * 1000, //15 mins
  });
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true, //prevent XSS attacks , cross-side scriptinf attacks
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict", //prevent CFRS attacks , cross-site request forgery
    maxAge: 7 * 24 * 60 * 60 * 1000, //7 days
  });
}

export const signup = async (req, res) => {
  const { email, password, name } = req.body;
  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }
    const user = await User.create({ name, email, password });

    // AUTHENTHICATE
    const { accessToken, refreshToken } = generateTokens(user._id)
    await storeRefreshToken(user._id, refreshToken);

    setCookies(res, accessToken, refreshToken)

    res.status(201).json({
      _id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    })
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user && (await user.comparePassword(password))) {
      const { accessToken, refreshToken } = generateTokens(user._id);

      await storeRefreshToken(user._id, refreshToken);
      setCookies(res, accessToken, refreshToken);

      res.json({
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      })
    } else {
      res.status(500).json({ message: "INVALID EMAIL OR PASSWORD" });
    }
  } catch (error) {
    console.log("ERROR IN LOGIN CONTROLLER", error.message);
    res.status(500).json({ message: error.message });
  }
};


export const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
      const decoded = jwt.verify(refreshToken, process.env.REFRESHTOKEN_TOKEN_SECRET);
      await redis.del(`refresh_token:${decoded.userId}`);
    }

    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    res.json({ message: "LOGGED OUT SECCESSFULLY" });
  } catch (error) {
    res.status(500).json({ message: "SERVER ERROR", error: error.message });
  }
};


export const refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: "NO REFRESH TOKEN PROVIDED" });
    }

    const decoded = jwt.verify(refreshToken, process.env.REFRESHTOKEN_TOKEN_SECRET);
    const storedToken = await redis.get(`refresh_token:${decoded.userId}`);

    if (storedToken !== refreshToken) {
      return res.status(401).json({ message: "INVALID REFRESH TOKEN" });
    }

    const accessToken = jwt.sign({ userId: decoded.userId }, process.env.ACCESSTOKEN_TOKEN_SECRET, { expiresIn: "15m" });

    res.cookie("accessToken", accessToken, {
      httpOnly: true, //prevent XSS attacks , cross-side scriptinf attacks
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict", //prevent CFRS attacks , cross-site request forgery
      maxAge: 15 * 60 * 1000, //15 mins
    });

    res.json({ message: "TOKEN REFRESHED SUCCESSFULLY" });

  }
  catch (error) {
    console.log("ERROR IN THE REFRESH TOKEN CONTROLLER", error.message);
    res.status(500).json({ message: "SERVER ERROR", error: error.message });
  }
}

export const getProfile = async (req, res) => {
  try {
    res.json(req.user);
  } catch (error) {
    res.status(500).json({ message: "SERVER ERROR", error: error.message })
  }
}