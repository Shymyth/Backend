import { Router } from "express";
import { loginUser, logOutUser, registerUser ,refreshAccessToken, changeCurrentPassword, getCurrentUser,   updateAccountDetails,
    updateUserAvatar,
    updateCoverImage
  } from '../controllers/user.controller.js';
import {  upload } from '../middlewares/multer.middleware.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';


const router = Router();

router.route('/register')
    .post(
        upload.fields([
            {
                name: "avatar",
                maxCount: 1
            },
            {
                name: "coverImage",
                maxCount: 1
            }
        ]),
        registerUser);

router.route('/login')
    .post(loginUser);

//secure routes
router.route('/logout').post(verifyJWT, logOutUser);

router.route('.refresh-token').post(refreshAccessToken);

router.route('/newpassword').post(verifyJWT, changeCurrentPassword);

router.route('/getuser').post(verifyJWT, getCurrentUser);

router.route('/update-account-details').post(verifyJWT, updateAccountDetails);

router.route('/update-avatar').post(verifyJWT, upload.single("avatar"), updateUserAvatar);

router.route('/update-cover-image').post(verifyJWT, upload.single("coverImage"), updateCoverImage);

export default router;