import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { User } from '../models/user.model.js';
import { Subscription } from '../models/subscription.model.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';

const generateAccessAndRefereshToken = async(userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = await user.generateAccessToken()
        const refreshToken = await user.generateRefreshToken()

    
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };

    } catch (error) {
        throw new ApiError(500, "Failed to generate tokens");
    }
}

const registerUser = asyncHandler(async (req, res) => {
    const { fullname, username, email , password} = req.body
    if ([fullname , username , email , password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required");
    }

    const existedUser = await User.findOne({
        $or: [{ username  }, { email }]
    })

    if(existedUser) {
        throw new ApiError(409, "Username or email already exists");
    }
    // console.log(req.files);

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
 
    const coverImage  = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400, "Failed to upload avatar");
    }

    const  user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username:  username.toLowerCase()

    });

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if( !createdUser ){
        throw new ApiError(500, "Failed to create user");
    }

    return res.status(201).json(
        new ApiResponse(201, createdUser, "User registered successfully")
    );
    
})

const loginUser = asyncHandler(async (req, res) => {
    const { email , username , password } = req.body;
    if (!(username || email)){
        throw new ApiError(400, "Username or email is required");
    }
    if (!password) {
        throw new ApiError(400, "Password is required");
    }
    
    const user = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (!user) {
        throw new ApiError(404, "User not found");
    }
    const isPasswordMatched = await user.isPasswordCorrect(password);
    if (!isPasswordMatched) {
        throw new ApiError(401, "Invalid credentials");
    }
    const { accessToken, refreshToken } = await generateAccessAndRefereshToken(user._id);

    const loggedInUser = await User.findByIdAndUpdate(user._id).select(
        "-password -refreshToken")
    
    const options = {
        httpOnly: true,
        secure: true,
    }
    
    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, 
            { user: loggedInUser, accessToken, refreshToken }
            , "User logged in successfully"));

})

const logOutUser = asyncHandler( async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, {
        $set: {
            refreshToken: undefined
        } },
        {
            new: true
        },
        
    )
    
    const options = {
        httpOnly: true,
        secure: true,
    }
    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out successfully"));
})

const refreshAccessToken = asyncHandler(async(req,res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if(!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request");
    }
  try {
      const decodedToken = jwt.verify(
          incomingRefreshToken,
          process.env.REFRESH_TOKEN_SECRET,
      )
      const user = await User.findById(decodedToken._id)
      
      if(!user){
          throw new ApiError(404,"invalid refresh token");
      }
      if(incomingRefreshToken !== user?.refreshToken) {
          throw new ApiError(401, "Refresh token is expired or used");
      }
      
      const options = {
          httpOnly: true,
          secure: true
      };
  
      const {accessToken , newrefreshToken}=await generateAccessAndRefereshToken(user._id);
  
      return res
          .status(200)
          .cookie("accessToken", accessToken,options )
          .cookie("refreshToken", newrefreshToken,options)
          .json(new ApiResponse(200, { accessToken: accessToken, refreshToken: newrefreshToken }, "Access token refreshed successfully")); 
 
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }

})

const changeCurrentPassword = asyncHandler(async(req,res)=>{
    const { password, newPassword } = req.body;
    if (!password || !newPassword) {
        throw new ApiError(400, "Current and new password are required");
    }
    const user = await User.findById(req.user?.id);
    const isPasswordMatched = await user.isPasswordCorrect(password);
    if (!isPasswordMatched) {
        throw new ApiError(401, "password is incorrect");
    }
    user.password = newPassword;
    await user.save({ validateBeforeSave: false })

    return res.status(200).json(
        new ApiResponse(200, {}, "Password changed successfully")
    );
})

const getCurrentUser = asyncHandler(async(req,res)=>{
    return res.status(200).json(200, req.user, "Current user fetched successfully");
})

const updateAccountDetails = asyncHandler(async(req,res)=>{
    const {fullname, username, email} = req.body;
    if(!fullname || !username || !email) {
        throw new ApiError(400, "All fields are required");
    }
    const user = await User.findByIdAndUpdate(req.user?._id,{
        $set: {
            fullname,
            username: username.toLowerCase(),
            email
        }
    },{new: true}).select("-password -refreshToken");

    return res.status(200).json(
        new ApiResponse(200, user, "Account details updated successfully")
    );
})

const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path;
    if(!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required");
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if(!avatar.url) {
        throw new ApiError(400, "Failed to upload avatar");
    }
    const user = await User.findByIdAndUpdate(req.user._id, {
        $set: {
            avatar: avatar.url
        }
    }, { new: true }).select("-password -refreshToken");

    return res.status(200).json(
        new ApiResponse(200, user, "Avatar updated successfully")
    );

})
const updateCoverImage = asyncHandler(async(req,res) =>{
    const coverImageLocalpath = req.file?.path;
    if(!coverImageLocalpath) {
        throw new ApiError(400, "Cover image is required");
    }
    const coverImage = await uploadOnCloudinary(coverImageLocalpath);
    if(!coverImage.url){
        throw new ApiError(400, "Failed to upload cover image");
    }
    const user = await User.findByIdAndUpdate(req.user._id, {
        $set: {
            coverImage: coverImage.url
        }
    }, { new: true }).select("-password -refreshToken");    

    return res.status(200).json(
        new ApiResponse(200, user, "Cover image updated successfully")
    );
})

export { registerUser,
    loginUser,
    logOutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateCoverImage
 };