import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";




export const verifyJWT = asyncHandler(async (req, _, next) => {
   try {
    let token
    //  let token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

     if (req.cookies?.accessToken) {
      token = req.cookies.accessToken;
    }
    // Extract token from Authorization header
    else if (req.headers?.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }
     
     if (!token ) {
        throw new ApiError(401,typeof(token), "Access denied, token not provided");
     }
     const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
 
     const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
     if (!user) {
         throw new ApiError(404, "User not found");
     }
 
     req.user = user;
     next();
   } catch (error) {
    throw new ApiError(401,error?.message|| "Invalid token");
   }
})