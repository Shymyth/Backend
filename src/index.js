import dotenv from "dotenv"
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
    path: './env'
})



connectDB()
    .then(() => {1
        app.listen(process.env.PORT || 8000, () => {
            console.log(`Server is running on port ${process.env.PORT}`);
        })
    })
    .catch((err) => {
        console.log("Error connecting to MongoDB:", err);
    })

// First approach to connect to MongoDB

// import express from "express";
// const app = express();


// ; (async () => {
//     try {
//         await mongoose.connect(`${process.env.DB_URL}/${DB_NAME}`)
//         app.on('error', (err) => {
//             console.log("Error connecting to MongoDB:", err);
//             throw err;
//         })

//         app.listen(process.env.PORT, () => {
//             console.log(`Server is running on port ${process.env.PORT}`)
//         });

//     } catch (error) {
//         console.error("Error connecting to MongoDB:", error);
//     }
// })()