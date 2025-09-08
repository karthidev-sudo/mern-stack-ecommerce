import Coupon from "../models/coupon.model.js"

export const getCoupon = async (req, res) => {
    try {
        const coupon = await Coupon.findOne({userId:req.user._id, isActive:true});
        res.json(coupon || null);
    } catch (error) {
        console.log("ERROR IN THE getCoupon CONTROLLER", error,message);
        res.status(500).res.json({message:"SERVER ERROR", error: error.message})
    }
}

export const validateCoupon = async (req, res) => {
    try {
        const {code} = req.body;
        const coupon = await Coupon.findOne({code:code,userId:req.user._id, isActive:true});

        if(!coupon){
            return res.status(401).json({message : "COUPON NOT AVAILABLE"})
        }
        
        if(coupon.expirationDate < new Date()){
            coupon.isActive = false;
            await coupon.save();
            return res.status(404).json({message: "COUPON EXPIRED"})
        }

        res.json({
            message : "COUPON IS VALID",
            code : coupon.code,
            discountPercentage : coupon.discountPercentage
        })
    } catch (error) {
        console.log("ERROR IN THE validateCoupon CONTROLLER", error.message);
        res.status(500).json({message : "SERVER ERROR", error: error.message})
    }
}